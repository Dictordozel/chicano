import { fail } from '@sveltejs/kit';
import {
	listServices,
	listBarbers,
	availabilityFor,
	bookableDates,
	createAppointment,
	getAppointment,
	findOrCreateUser,
	createSession,
	TIME_SLOTS
} from '$lib/server/db.js';
import { SESSION_COOKIE } from '$lib/auth.js';
import { syncReminders } from '$lib/server/notifications.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	const barbers = /** @type {any[]} */ (listBarbers());

	// Whole two-week grid for every barber up front: the picker then switches
	// barber and date instantly, with no extra round-trip on a phone connection.
	/** @type {Record<number, Record<string, string[]>>} */
	const availability = {};
	for (const b of barbers) availability[b.id] = availabilityFor(b.id);

	return {
		services: listServices(),
		barbers,
		availability,
		dates: bookableDates(),
		slots: TIME_SLOTS,
		preselect: url.searchParams.get('service')
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	book: async ({ request, locals, cookies, url }) => {
		const form = await request.formData();

		const serviceId = Number(form.get('serviceId'));
		const barberId = Number(form.get('barberId'));
		const date = String(form.get('date') ?? '');
		const time = String(form.get('time') ?? '');
		const note = String(form.get('note') ?? '');

		/** @type {Record<string, string>} */
		const errors = {};
		if (!serviceId) errors.service = 'Pick a service.';
		if (!barberId) errors.barber = 'Pick a barber.';
		if (!bookableDates().includes(date)) errors.date = 'Pick a day within the next two weeks.';
		if (!TIME_SLOTS.includes(time)) errors.time = 'Pick a time.';

		// Signed out? The same form doubles as sign-up — nobody re-types a booking.
		let user = locals.user;
		if (!user) {
			const name = String(form.get('name') ?? '').trim();
			const email = String(form.get('email') ?? '').trim();
			const phone = String(form.get('phone') ?? '').trim();

			if (name.length < 2) errors.name = 'Tell us what to call you.';
			if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

			if (!Object.keys(errors).length) {
				user = findOrCreateUser(email, name, phone);
				const session = createSession(user.id);
				cookies.set(SESSION_COOKIE, session.id, {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: url.protocol === 'https:',
					maxAge: 60 * 60 * 24 * 30
				});
			}
		}

		if (Object.keys(errors).length || !user) {
			return fail(400, { errors, values: { serviceId, barberId, date, time, note } });
		}

		// Slot availability is enforced by a UNIQUE index, so a race between two
		// phones ends in a clean message instead of a double booking.
		if (!availabilityFor(barberId)[date]?.includes(time)) {
			return fail(409, {
				errors: { time: 'That slot was just taken. Pick another one.' },
				values: { serviceId, barberId, date, time, note }
			});
		}

		let id;
		try {
			id = createAppointment({ userId: user.id, serviceId, barberId, date, time, note });
		} catch (err) {
			return fail(409, {
				errors: { time: 'That slot was just taken. Pick another one.' },
				values: { serviceId, barberId, date, time, note }
			});
		}

		// Queue the day-before and hour-before texts for this slot.
		syncReminders(id);

		return { success: true, appointment: getAppointment(id) };
	}
};
