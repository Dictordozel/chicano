import { redirect, fail } from '@sveltejs/kit';
import { listAppointments, cancelAppointment, listOrders, today } from '$lib/server/db.js';
import { syncReminders } from '$lib/server/notifications.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (!locals.user) redirect(303, '/login?next=/account');

	const all = /** @type {any[]} */ (listAppointments(locals.user.id));
	const now = today();

	return {
		upcoming: all.filter((a) => a.status !== 'cancelled' && a.date >= now),
		past: all.filter((a) => a.status === 'cancelled' || a.date < now),
		orders: listOrders(locals.user.id).map((o) => ({
			...o,
			items: /** @type {any[]} */ (JSON.parse(o.items_json))
		}))
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	cancel: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in first.' });

		const form = await request.formData();
		const changed = cancelAppointment(Number(form.get('id')), locals.user.id);
		if (!changed) return fail(404, { message: 'Booking not found.' });

		// A cancelled slot must not still text the client.
		syncReminders(Number(form.get('id')));

		return { cancelled: true };
	}
};
