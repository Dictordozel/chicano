import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guard.js';
import {
	listClients,
	getClient,
	createClient,
	updateClient,
	deleteClient,
	setClientAdmin,
	countAdmins
} from '$lib/server/admin.js';
import { db } from '$lib/server/db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const query = url.searchParams.get('q') ?? '';
	const editId = Number(url.searchParams.get('edit')) || 0;
	const editing = editId ? getClient(editId) : null;

	return {
		clients: listClients(query),
		query,
		editing,
		adminCount: countAdmins(),
		// Shown next to the form so the admin sees whose record they are touching.
		history: editing
			? db
					.prepare(
						`SELECT a.date, a.time, a.status, s.title AS service, b.alias AS barber
						 FROM appointments a
						 JOIN services s ON s.id = a.service_id
						 JOIN barbers  b ON b.id = a.barber_id
						 WHERE a.user_id = ?
						 ORDER BY a.date DESC, a.time DESC
						 LIMIT 5`
					)
					.all(editing.id)
			: []
	};
}

/** Shared by create and update. @param {FormData} form */
function readClient(form) {
	const values = {
		name: String(form.get('name') ?? '').trim(),
		email: String(form.get('email') ?? '').trim(),
		phone: String(form.get('phone') ?? '').trim()
	};

	/** @type {Record<string, string>} */
	const errors = {};
	if (values.name.length < 2) errors.name = 'Enter the client’s name.';
	if (!EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email address.';
	if (values.phone && values.phone.replace(/\D/g, '').length < 10)
		errors.phone = 'That phone looks too short.';

	return { values, errors };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const { values, errors } = readClient(await request.formData());

		if (Object.keys(errors).length) return fail(400, { errors, values });

		const result = createClient(values);
		if (!result.ok) {
			return fail(409, { errors: { email: 'That email already belongs to a client.' }, values });
		}
		return { created: values.name };
	},

	update: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!getClient(id)) return fail(404, { message: 'That client no longer exists.' });

		const { values, errors } = readClient(form);
		if (Object.keys(errors).length) return fail(400, { errors, values, editingId: id });

		const result = updateClient(id, values);
		if (!result.ok) {
			return fail(409, {
				errors: { email: `That email already belongs to ${result.holder}.` },
				values,
				editingId: id
			});
		}

		redirect(303, '/admin/clients');
	},

	setAdmin: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const grant = String(form.get('grant')) === '1';

		const client = getClient(id);
		if (!client) return fail(404, { message: 'Client not found.' });

		// Revoking your own rights would bounce you to the passcode gate on the
		// next click — refuse rather than surprise.
		if (locals.user && locals.user.id === id) {
			return fail(409, { message: 'You cannot change your own back-office rights.' });
		}

		setClientAdmin(id, grant);
		return { rights: { name: client.name, granted: grant } };
	},

	remove: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		const client = getClient(id);
		if (!client) return fail(404, { message: 'Client not found.' });

		if (locals.user && locals.user.id === id) {
			return fail(409, { message: 'You cannot delete the account you are signed in with.' });
		}

		const result = deleteClient(id);
		if (!result.ok) {
			const parts = [];
			if (result.bookings) parts.push(`${result.bookings} booking${result.bookings === 1 ? '' : 's'}`);
			if (result.orders) parts.push(`${result.orders} order${result.orders === 1 ? '' : 's'}`);
			return fail(409, {
				message: `“${client.name}” still has ${parts.join(' and ')}. Clear those first.`
			});
		}

		return { removed: client.name };
	}
};
