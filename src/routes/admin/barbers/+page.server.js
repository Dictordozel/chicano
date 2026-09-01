import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guard.js';
import { createBarber, updateBarber, deleteBarber, getBarber } from '$lib/server/admin.js';
import { listBarbers, db } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const barbers = /** @type {any[]} */ (listBarbers());
	const counts = /** @type {{ barber_id: number, n: number }[]} */ (
		db
			.prepare(
				"SELECT barber_id, COUNT(*) AS n FROM appointments WHERE status != 'cancelled' GROUP BY barber_id"
			)
			.all()
	);

	const editId = Number(url.searchParams.get('edit')) || 0;

	return {
		barbers: barbers.map((b) => ({
			...b,
			booked: counts.find((c) => c.barber_id === b.id)?.n ?? 0
		})),
		editing: editId ? getBarber(editId) : null
	};
}

/** Shared by create and update. @param {FormData} form */
function readBarber(form) {
	const values = {
		name: String(form.get('name') ?? '').trim(),
		alias: String(form.get('alias') ?? '').trim(),
		specialty: String(form.get('specialty') ?? '').trim(),
		bio: String(form.get('bio') ?? '').trim(),
		years: Number(form.get('years')),
		slug: String(form.get('slug') ?? '').trim()
	};

	/** @type {Record<string, string>} */
	const errors = {};
	if (values.name.length < 2) errors.name = 'Enter the full name.';
	if (values.alias.length < 2) errors.alias = 'Every barber here has a street name.';
	if (values.specialty.length < 3) errors.specialty = 'What are they known for?';
	if (!Number.isFinite(values.years) || values.years < 0 || values.years > 70)
		errors.years = 'Years must be 0–70.';

	values.bio = values.bio || values.specialty;

	return { values, errors };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const { values, errors } = readBarber(await request.formData());

		if (Object.keys(errors).length) return fail(400, { errors, values });

		createBarber(values);
		return { created: values.alias };
	},

	update: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!getBarber(id)) return fail(404, { message: 'That barber no longer exists.' });

		const { values, errors } = readBarber(form);
		if (Object.keys(errors).length) return fail(400, { errors, values, editingId: id });

		updateBarber(id, values);
		// Back to a clean list — the edit is done and the URL should say so.
		redirect(303, '/admin/barbers');
	},

	remove: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		const alias = /** @type {{ alias: string } | undefined} */ (
			db.prepare('SELECT alias FROM barbers WHERE id = ?').get(id)
		)?.alias;

		const result = deleteBarber(id);
		if (!result.ok) {
			return fail(409, {
				message: `“${alias}” has ${result.used} booking${result.used === 1 ? '' : 's'} on the books and cannot be deleted.`
			});
		}
		return { removed: alias ?? 'Barber' };
	}
};
