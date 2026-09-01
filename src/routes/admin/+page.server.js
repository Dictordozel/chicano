import { requireAdmin } from '$lib/server/guard.js';
import { adminStats, listAllAppointments } from '$lib/server/admin.js';
import { today } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const day = today();
	const all = /** @type {any[]} */ (listAllAppointments({ from: day, limit: 60 }));

	return {
		stats: adminStats(),
		todayList: all.filter((a) => a.date === day && a.status !== 'cancelled'),
		nextUp: all.filter((a) => a.date > day && a.status !== 'cancelled').slice(0, 8)
	};
}
