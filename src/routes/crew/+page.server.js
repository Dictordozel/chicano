import { listBarbers, availabilityFor, today } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	const barbers = /** @type {any[]} */ (listBarbers());
	const day = today();

	// A "free today" count gives the crew page a reason to exist beyond bios.
	return {
		barbers: barbers.map((b) => ({
			...b,
			freeToday: (availabilityFor(b.id)[day] ?? []).length
		}))
	};
}
