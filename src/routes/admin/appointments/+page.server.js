import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guard.js';
import {
	listAllAppointments,
	availabilityGrid,
	freeSlotsOn,
	getAppointmentForEdit,
	updateAppointment,
	deleteAppointment,
	setAppointmentStatus
} from '$lib/server/admin.js';
import {
	listServices,
	listBarbers,
	findOrCreateUser,
	createAppointment,
	today,
	TIME_SLOTS,
	db
} from '$lib/server/db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Days of availability preloaded for the slot picker. */
const WINDOW = 30;

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const editId = Number(url.searchParams.get('edit')) || 0;
	const editing = editId ? getAppointmentForEdit(editId) : null;

	// The booking being edited must not block its own slot in the picker.
	const { dates, grid } = availabilityGrid(today(), WINDOW, editing?.id ?? null);

	return {
		appointments: listAllAppointments({ limit: 200 }),
		services: listServices(),
		barbers: listBarbers(),
		slots: TIME_SLOTS,
		availability: grid,
		windowStart: dates[0],
		windowEnd: dates[dates.length - 1],
		editing,
		recentClients: db
			.prepare('SELECT email, name, phone FROM users ORDER BY id DESC LIMIT 20')
			.all()
	};
}

/** Shared by create and update. @param {FormData} form */
function readAppointment(form) {
	const values = {
		email: String(form.get('email') ?? '').trim(),
		name: String(form.get('name') ?? '').trim(),
		phone: String(form.get('phone') ?? '').trim(),
		serviceId: Number(form.get('serviceId')),
		barberId: Number(form.get('barberId')),
		date: String(form.get('date') ?? ''),
		time: String(form.get('time') ?? ''),
		note: String(form.get('note') ?? '').trim()
	};

	/** @type {Record<string, string>} */
	const errors = {};
	if (!EMAIL_RE.test(values.email)) errors.email = 'Enter the client’s email.';
	if (values.name.length < 2) errors.name = 'Enter the client’s name.';
	if (!DATE_RE.test(values.date)) errors.date = 'Pick a date.';
	else if (values.date < today()) errors.date = 'That date is in the past.';
	if (!TIME_SLOTS.includes(values.time)) errors.time = 'Pick a time.';
	if (!db.prepare('SELECT 1 FROM services WHERE id = ?').get(values.serviceId))
		errors.serviceId = 'Pick a service.';
	if (!db.prepare('SELECT 1 FROM barbers WHERE id = ?').get(values.barberId))
		errors.barberId = 'Pick a barber.';

	return { values, errors };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const { values, errors } = readAppointment(await request.formData());

		if (Object.keys(errors).length) return fail(400, { errors, values });

		if (!freeSlotsOn(values.barberId, values.date).includes(values.time)) {
			return fail(409, { errors: { time: 'That chair is already taken at this time.' }, values });
		}

		// Booking on behalf of a walk-in creates the client record if needed.
		const client = findOrCreateUser(values.email, values.name, values.phone);

		let id;
		try {
			id = createAppointment({
				userId: client.id,
				serviceId: values.serviceId,
				barberId: values.barberId,
				date: values.date,
				time: values.time,
				note: values.note
			});
		} catch {
			return fail(409, { errors: { time: 'That chair is already taken at this time.' }, values });
		}

		return { created: { id, client: client.name, date: values.date, time: values.time } };
	},

	update: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!getAppointmentForEdit(id)) return fail(404, { message: 'That booking no longer exists.' });

		const { values, errors } = readAppointment(form);
		if (Object.keys(errors).length) return fail(400, { errors, values, editingId: id });

		if (!freeSlotsOn(values.barberId, values.date, id).includes(values.time)) {
			return fail(409, {
				errors: { time: 'That chair is already taken at this time.' },
				values,
				editingId: id
			});
		}

		// A different email moves the booking to that client; the same one just
		// refreshes their name and phone.
		const client = findOrCreateUser(values.email, values.name, values.phone);

		try {
			updateAppointment(id, {
				userId: client.id,
				serviceId: values.serviceId,
				barberId: values.barberId,
				date: values.date,
				time: values.time,
				note: values.note
			});
		} catch {
			return fail(409, {
				errors: { time: 'That chair is already taken at this time.' },
				values,
				editingId: id
			});
		}

		redirect(303, '/admin/appointments');
	},

	cancel: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const changed = setAppointmentStatus(Number(form.get('id')), 'cancelled');
		if (!changed) return fail(404, { message: 'Booking not found.' });
		return { cancelled: true };
	},

	restore: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		const row = /** @type {{ barber_id: number, date: string, time: string } | undefined} */ (
			db.prepare('SELECT barber_id, date, time FROM appointments WHERE id = ?').get(id)
		);
		if (!row) return fail(404, { message: 'Booking not found.' });

		// The slot may have been given away while this one sat cancelled.
		if (!freeSlotsOn(row.barber_id, row.date, id).includes(row.time)) {
			return fail(409, { message: 'That slot has been taken by someone else.' });
		}

		setAppointmentStatus(id, 'confirmed');
		return { restored: true };
	},

	remove: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const changed = deleteAppointment(Number(form.get('id')));
		if (!changed) return fail(404, { message: 'Booking not found.' });
		return { removed: true };
	}
};
