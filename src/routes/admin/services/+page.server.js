import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guard.js';
import {
	createService,
	updateService,
	deleteService,
	getService
} from '$lib/server/admin.js';
import { listServices, db } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const services = /** @type {any[]} */ (listServices());
	const counts = /** @type {{ service_id: number, n: number }[]} */ (
		db.prepare('SELECT service_id, COUNT(*) AS n FROM appointments GROUP BY service_id').all()
	);

	const editId = Number(url.searchParams.get('edit')) || 0;

	return {
		services: services.map((s) => ({
			...s,
			booked: counts.find((c) => c.service_id === s.id)?.n ?? 0
		})),
		editing: editId ? getService(editId) : null
	};
}

/**
 * Shared by create and update — the two differ only in what they do with the
 * result.
 * @param {FormData} form
 */
function readService(form) {
	const values = {
		title: String(form.get('title') ?? '').trim(),
		category: String(form.get('category') ?? 'hair'),
		tagline: String(form.get('tagline') ?? '').trim(),
		description: String(form.get('description') ?? '').trim(),
		duration_min: Number(form.get('duration_min')),
		price: Number(form.get('price')),
		slug: String(form.get('slug') ?? '').trim()
	};

	/** @type {Record<string, string>} */
	const errors = {};
	if (values.title.length < 2) errors.title = 'Give the service a name.';
	if (!['hair', 'beard'].includes(values.category)) errors.category = 'Pick a category.';
	if (values.description.length < 10) errors.description = 'Describe the work in a sentence.';
	if (!Number.isFinite(values.duration_min) || values.duration_min < 5 || values.duration_min > 480)
		errors.duration_min = 'Duration must be 5–480 minutes.';
	if (!Number.isFinite(values.price) || values.price < 0) errors.price = 'Price must be 0 or more.';

	values.tagline = values.tagline || (values.category === 'hair' ? 'Haircut' : 'Beard work');

	return { values, errors };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const { values, errors } = readService(await request.formData());

		if (Object.keys(errors).length) return fail(400, { errors, values });

		createService(values);
		return { created: values.title };
	},

	update: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!getService(id)) return fail(404, { message: 'That service no longer exists.' });

		const { values, errors } = readService(form);
		if (Object.keys(errors).length) return fail(400, { errors, values, editingId: id });

		updateService(id, values);
		// Back to a clean list — the edit is done and the URL should say so.
		redirect(303, '/admin/services');
	},

	remove: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		const title = /** @type {{ title: string } | undefined} */ (
			db.prepare('SELECT title FROM services WHERE id = ?').get(id)
		)?.title;

		const result = deleteService(id);
		if (!result.ok) {
			return fail(409, {
				message: `“${title}” is used by ${result.used} booking${result.used === 1 ? '' : 's'} and cannot be deleted.`
			});
		}
		return { removed: title ?? 'Service' };
	}
};
