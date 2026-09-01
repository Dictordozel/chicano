/**
 * End-to-end check of the SMS schedule, driven entirely through the running
 * app: every mutation goes over HTTP, every assertion reads the database.
 *
 *   npm run dev
 *   node scripts/test-notifications.mjs
 *
 * Everything it creates is removed at the end.
 */
const BASE = process.env.BASE ?? 'http://localhost:5173';
const PASSCODE = process.env.ADMIN_PASSCODE ?? 'chicano';

const { db } = await import('../src/lib/server/db.js');

const HOUR = 3_600_000;
const LEAD = { reminder_day: 24 * HOUR, reminder_hour: 1 * HOUR };

let pass = 0;
let fail = 0;
/** @param {string} label @param {boolean} ok @param {unknown} [detail] */
function check(label, ok, detail) {
	console.log(`  ${ok ? '✓' : '✗'} ${label}${detail !== undefined ? `  → ${detail}` : ''}`);
	ok ? pass++ : fail++;
}

/* --------------------------------------------------------- plumbing */

const jar = new Map();
async function req(path, body) {
	const res = await fetch(BASE + path, {
		method: body ? 'POST' : 'GET',
		redirect: 'manual',
		headers: {
			cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
			accept: 'text/html',
			...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {})
		},
		body: body ? new URLSearchParams(body).toString() : undefined
	});
	for (const raw of res.headers.getSetCookie?.() ?? []) {
		const [pair] = raw.split(';');
		const i = pair.indexOf('=');
		jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
	}
	return { status: res.status, text: await res.text() };
}

const d = new Date();
const day = (n) => {
	const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
	return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const epochOf = (date, time) => {
	const [y, m, dd] = date.split('-').map(Number);
	const [hh, mi] = time.split(':').map(Number);
	return new Date(y, m - 1, dd, hh, mi, 0, 0).getTime();
};

const notesFor = (id) =>
	db
		.prepare('SELECT kind, status, send_at, phone, error FROM notifications WHERE appointment_id = ? ORDER BY kind')
		.all(id);

const idFor = (email) =>
	db
		.prepare('SELECT a.id FROM appointments a JOIN users u ON u.id = a.user_id WHERE u.email = ?')
		.get(email)?.id;

const serviceId = (slug) => db.prepare('SELECT id FROM services WHERE slug = ?').get(slug).id;

const freeSlot = (barberId, date) => {
	const taken = db
		.prepare("SELECT time FROM appointments WHERE barber_id = ? AND date = ? AND status != 'cancelled'")
		.all(barberId, date)
		.map((r) => r.time);
	return ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].find(
		(t) => !taken.includes(t)
	);
};

/* ------------------------------------------------- sign in as admin */
await req('/login', { name: 'SMS Tester', email: 'sms-test@polus.io', next: '/admin' });
await req('/admin/unlock', { passcode: PASSCODE, next: '/admin' });

/* ---------------------------- 1. a booking schedules two reminders */
console.log('\nreminders follow the booking');
const farDate = day(6);
const slot = freeSlot(1, farDate);

await req('/admin/appointments?/create', {
	email: 'sms-client@example.com',
	name: 'Иван Тестов',
	phone: '8 (916) 555-11-22',
	serviceId: String(serviceId('slicked-back')),
	barberId: '1',
	date: farDate,
	time: slot
});
const apptId = idFor('sms-client@example.com');

let rows = notesFor(apptId);
check('two reminders queued', rows.length === 2 && rows.every((x) => x.status === 'pending'), rows.map((x) => x.kind).join(', '));

const startsAt = epochOf(farDate, slot);
check('day reminder is 24 h early', startsAt - rows.find((x) => x.kind === 'reminder_day').send_at === LEAD.reminder_day);
check('hour reminder is 1 h early', startsAt - rows.find((x) => x.kind === 'reminder_hour').send_at === LEAD.reminder_hour);
check('phone normalised to E.164', rows[0].phone === '+79165551122', rows[0].phone);

/* ------------------------------------- 2. moving the slot moves them */
const newDate = day(8);
const newSlot = freeSlot(2, newDate);
await req('/admin/appointments?/update', {
	id: String(apptId),
	email: 'sms-client@example.com',
	name: 'Иван Тестов',
	phone: '8 (916) 555-11-22',
	serviceId: String(serviceId('slicked-back')),
	barberId: '2',
	date: newDate,
	time: newSlot
});
rows = notesFor(apptId);
const movedStart = epochOf(newDate, newSlot);
check('reminders moved with the booking', rows.every((x) => movedStart - x.send_at === LEAD[x.kind]));

/* -------------------------------------------- 3. cancel and restore */
await req('/admin/appointments?/cancel', { id: String(apptId) });
check('cancelling withdraws them', notesFor(apptId).every((x) => x.status === 'cancelled'));

await req('/admin/appointments?/restore', { id: String(apptId) });
check('restoring re-queues them', notesFor(apptId).every((x) => x.status === 'pending'));

/* ------------------------------------------------------ 4. no phone */
console.log('\nedge cases');
const npDate = day(9);
await req('/admin/appointments?/create', {
	email: 'no-phone@example.com',
	name: 'Без Телефона',
	serviceId: String(serviceId('buzz-crop')),
	barberId: '3',
	date: npDate,
	time: freeSlot(3, npDate)
});
rows = notesFor(idFor('no-phone@example.com'));
check(
	'no phone → skipped with a reason, never queued',
	rows.length === 2 && rows.every((x) => x.status === 'skipped' && x.error === 'client has no phone')
);

/* -------------------------- 5. booked inside the 24 h reminder window */
const soonSlot = freeSlot(4, day(0));
if (soonSlot) {
	await req('/admin/appointments?/create', {
		email: 'soon@example.com',
		name: 'Скоро Клиент',
		phone: '+7 916 777-88-99',
		serviceId: String(serviceId('buzz-crop')),
		barberId: '4',
		date: day(0),
		time: soonSlot
	});
	const soonId = idFor('soon@example.com');
	if (soonId) {
		const dayR = notesFor(soonId).find((x) => x.kind === 'reminder_day');
		check('booked today → yesterday’s reminder skipped, not blasted', dayR.status === 'skipped', dayR.error);
	}
}

/* ------------------------------------------------- 6. delivery once */
console.log('\ndelivery');
db.prepare("UPDATE notifications SET send_at = ? WHERE appointment_id = ? AND kind = 'reminder_hour'").run(
	Date.now() - 1000,
	apptId
);
await req('/admin/messages?/drain', {});
const afterFirst = db
	.prepare("SELECT status, provider FROM notifications WHERE appointment_id = ? AND kind = 'reminder_hour'")
	.get(apptId);
check('due reminder is delivered', afterFirst.status === 'sent', `provider ${afterFirst.provider}`);

await req('/admin/messages?/drain', {});
const afterSecond = db
	.prepare("SELECT status, attempts FROM notifications WHERE appointment_id = ? AND kind = 'reminder_hour'")
	.get(apptId);
check('a second drain does not resend it', afterSecond.attempts === 1, `attempts ${afterSecond.attempts}`);

/* ---------------------------------------------- 7. overdue is dropped */
db.prepare(
	"UPDATE notifications SET status = 'pending', send_at = ? WHERE appointment_id = ? AND kind = 'reminder_day'"
).run(Date.now() - 12 * HOUR, apptId);
await req('/admin/messages?/drain', {});
check(
	'12 h overdue reminder expires instead of arriving late',
	db.prepare("SELECT status FROM notifications WHERE appointment_id = ? AND kind = 'reminder_day'").get(apptId).status === 'expired'
);

/* ---------------------------------------------------- 8. broadcast */
console.log('\nbroadcast');
const audience = db
	.prepare(
		`SELECT u.phone FROM appointments a JOIN users u ON u.id = a.user_id
		 WHERE a.date = ? AND a.status != 'cancelled'`
	)
	.all(newDate);
const reachable = audience.filter((a) => a.phone && a.phone.replace(/\D/g, '').length >= 10).length;

const before = db.prepare("SELECT COUNT(*) c FROM notifications WHERE kind = 'broadcast'").get().c;
const beforeMaxId = db.prepare('SELECT COALESCE(MAX(id), 0) m FROM notifications').get().m;
let res = await req('/admin/messages?/broadcast', {
	scope: 'date',
	date: newDate,
	until: newDate,
	barberId: '0',
	template: 'Форс-мажор: {name}, запись на {date} в {time} переносится. Приносим извинения.',
	confirm: String(reachable)
});
const after = db.prepare("SELECT COUNT(*) c FROM notifications WHERE kind = 'broadcast'").get().c;
check('broadcast wrote one row per booking', after - before === audience.length, `${after - before} rows for ${audience.length} bookings`);
check(
	'reachable recipients delivered',
	db.prepare("SELECT COUNT(*) c FROM notifications WHERE kind='broadcast' AND status='sent'").get().c >= reachable,
	`${reachable} reachable`
);
const batch = db.prepare("SELECT body FROM notifications WHERE kind='broadcast' AND id > ? ").all(beforeMaxId);
check('every body had its placeholders filled', batch.length > 0 && batch.every((b) => !b.body.includes('{')));
check('the client name reached at least one body', batch.some((b) => b.body.includes('Иван Тестов')));

/* ------------------------------- 9. the confirmation gate really gates */
res = await req('/admin/messages?/broadcast', {
	scope: 'date',
	date: newDate,
	until: newDate,
	barberId: '0',
	template: 'Второе сообщение, но подтверждение неверное.',
	confirm: '999'
});
check('wrong confirmation count is refused', res.status === 400 && res.text.includes('to confirm sending'));

/* -------------------------------- 10. a repeat broadcast is allowed */
const beforeRepeat = db.prepare("SELECT COUNT(*) c FROM notifications WHERE kind = 'broadcast'").get().c;
await req('/admin/messages?/broadcast', {
	scope: 'date',
	date: newDate,
	until: newDate,
	barberId: '0',
	template: 'Обновление: свет дали, работаем по расписанию.',
	confirm: String(reachable)
});
check(
	'the same day can be messaged twice',
	db.prepare("SELECT COUNT(*) c FROM notifications WHERE kind = 'broadcast'").get().c > beforeRepeat
);

/* ------------------------------------------------------------ cleanup */
db.prepare(
	"DELETE FROM users WHERE email IN ('sms-test@polus.io','sms-client@example.com','no-phone@example.com','soon@example.com')"
).run();
db.prepare('DELETE FROM notifications WHERE id > ?').run(beforeMaxId);
const orphans = db.prepare('SELECT COUNT(*) c FROM notifications').get().c;

console.log(`\n${pass} passed, ${fail} failed. notification rows left behind: ${orphans}`);
process.exit(fail === 0 ? 0 : 1);
