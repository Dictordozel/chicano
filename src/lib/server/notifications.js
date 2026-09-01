/**
 * Outbox and scheduler for client SMS.
 *
 * Two jobs:
 *   1. Reminders — one a day before an appointment, one an hour before.
 *   2. Broadcasts — an admin telling everyone in the book that something has
 *      gone wrong (power cut, burst pipe) and their slot is moving.
 *
 * Everything queues into one `notifications` table and one worker drains it, so
 * a message is never sent twice and never lost when the server is down.
 */
import { db } from './db.js';
import { normalizePhone, renderTemplate, sendSms, providerName } from './sms.js';

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind           TEXT    NOT NULL,           -- reminder_day | reminder_hour | broadcast
  phone          TEXT,
  body           TEXT    NOT NULL,
  send_at        INTEGER NOT NULL,           -- epoch ms, local wall clock resolved
  status         TEXT    NOT NULL DEFAULT 'pending',
  attempts       INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  provider       TEXT,
  provider_id    TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  sent_at        TEXT
);

-- One reminder of each kind per appointment. Broadcasts are deliberately
-- excluded: an outage can be announced more than once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_reminder
  ON notifications (appointment_id, kind)
  WHERE kind IN ('reminder_day', 'reminder_hour');

CREATE INDEX IF NOT EXISTS idx_notifications_due
  ON notifications (status, send_at);
`);

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

const HOUR = 60 * 60 * 1000;

/** How early each reminder goes out. */
export const LEAD_TIMES = {
	reminder_day: 24 * HOUR,
	reminder_hour: 1 * HOUR
};

/**
 * A reminder that is this far overdue is dropped rather than sent. Protects
 * clients from a burst of stale messages after the server was off overnight.
 */
const STALE_AFTER = 6 * HOUR;

/**
 * Appointment date + time as an epoch, in the server's local zone — the same
 * clock the shop reads off the wall.
 *
 * @param {string} date YYYY-MM-DD
 * @param {string} time HH:MM
 */
export function appointmentEpoch(date, time) {
	const [y, m, d] = date.split('-').map(Number);
	const [hh, mm] = time.split(':').map(Number);
	return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

/** @param {number} epoch */
export function formatWhen(epoch) {
	return new Intl.DateTimeFormat('ru-RU', {
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(epoch));
}

/* ------------------------------------------------------------------ */
/* Message templates                                                   */
/* ------------------------------------------------------------------ */

/**
 * Client-facing text is Russian — the clients are. Placeholders are filled by
 * `renderTemplate`: {name} {date} {time} {barber} {service}.
 */
export const TEMPLATES = {
	reminder_day:
		'Chicano Barbershop: {name}, напоминаем — завтра в {time} вас ждёт {service}, мастер {barber}. Отменить или перенести: {phone_shop}',
	reminder_hour:
		'Chicano Barbershop: {name}, через час, в {time} — {service}, мастер {barber}. Ждём вас!',
	broadcast_default:
		'Chicano Barbershop: {name}, к сожалению, ваша запись на {date} в {time} переносится в связи с отключением электроэнергии. Мы свяжемся с вами для выбора нового времени. Извините за неудобства.'
};

const SHOP_PHONE = '+7 000 000-00-00';

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

/** @param {number} id */
function loadAppointment(id) {
	return /** @type {any} */ (
		db
			.prepare(
				`SELECT a.id, a.date, a.time, a.status, a.user_id,
				        s.title AS service, b.alias AS barber,
				        u.name AS client_name, u.phone AS client_phone
				 FROM appointments a
				 JOIN services s ON s.id = a.service_id
				 JOIN barbers  b ON b.id = a.barber_id
				 JOIN users    u ON u.id = a.user_id
				 WHERE a.id = ?`
			)
			.get(id) ?? null
	);
}

/**
 * Brings an appointment's pending reminders in line with its current state.
 * Call it after any change to a booking — create, move, cancel, restore.
 * Already-sent reminders are never touched.
 *
 * @param {number} appointmentId
 */
export function syncReminders(appointmentId) {
	const appt = loadAppointment(appointmentId);

	// Gone or cancelled: withdraw anything still queued.
	if (!appt || appt.status === 'cancelled') {
		const n = db
			.prepare(
				`UPDATE notifications SET status = 'cancelled'
				 WHERE appointment_id = ? AND status = 'pending' AND kind LIKE 'reminder%'`
			)
			.run(appointmentId).changes;
		return { scheduled: 0, cancelled: n };
	}

	const startsAt = appointmentEpoch(appt.date, appt.time);
	const phone = normalizePhone(appt.client_phone);
	const now = Date.now();

	let scheduled = 0;

	for (const kind of /** @type {(keyof typeof LEAD_TIMES)[]} */ (Object.keys(LEAD_TIMES))) {
		const sendAt = startsAt - LEAD_TIMES[kind];

		const existing = /** @type {{ id: number, status: string } | undefined} */ (
			db
				.prepare('SELECT id, status FROM notifications WHERE appointment_id = ? AND kind = ?')
				.get(appointmentId, kind)
		);

		// Already delivered — the client has been told; leave the record alone.
		if (existing && existing.status === 'sent') continue;

		// Booked too late for this reminder to mean anything.
		const tooLate = sendAt <= now - STALE_AFTER || startsAt <= now;

		const body = renderTemplate(TEMPLATES[kind], {
			name: appt.client_name,
			service: appt.service,
			barber: appt.barber,
			time: appt.time,
			date: appt.date,
			phone_shop: SHOP_PHONE
		});

		const status = tooLate ? 'skipped' : phone ? 'pending' : 'skipped';
		const error = tooLate ? 'booked too close to the slot' : phone ? null : 'client has no phone';

		if (existing) {
			db.prepare(
				`UPDATE notifications
				 SET phone = ?, body = ?, send_at = ?, status = ?, error = ?
				 WHERE id = ?`
			).run(phone, body, sendAt, status, error, existing.id);
		} else {
			db.prepare(
				`INSERT INTO notifications (appointment_id, user_id, kind, phone, body, send_at, status, error)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			).run(appointmentId, appt.user_id, kind, phone, body, sendAt, status, error);
		}

		if (status === 'pending') scheduled++;
	}

	return { scheduled, cancelled: 0 };
}

/** Rebuilds reminders for every upcoming booking. Useful after a data import. */
export function resyncAllUpcoming() {
	const rows = /** @type {{ id: number }[]} */ (
		db
			.prepare(
				"SELECT id FROM appointments WHERE status != 'cancelled' AND date >= date('now', '-1 day')"
			)
			.all()
	);
	let scheduled = 0;
	for (const r of rows) scheduled += syncReminders(r.id).scheduled;
	return { appointments: rows.length, scheduled };
}

/* ------------------------------------------------------------------ */
/* Delivery worker                                                     */
/* ------------------------------------------------------------------ */

/** @param {number} [limit] */
export function dueNotifications(limit = 50) {
	return /** @type {any[]} */ (
		db
			.prepare(
				"SELECT * FROM notifications WHERE status = 'pending' AND send_at <= ? ORDER BY send_at LIMIT ?"
			)
			.all(Date.now(), limit)
	);
}

/**
 * Sends everything that has come due. Safe to call concurrently-ish: each row
 * is claimed with a conditional UPDATE before the network call.
 */
export async function tick() {
	const rows = dueNotifications();
	let sent = 0;
	let failed = 0;
	let expired = 0;

	for (const row of rows) {
		// Reminder that sat too long while the server was down — drop it.
		if (row.kind.startsWith('reminder') && Date.now() > row.send_at + STALE_AFTER) {
			db.prepare("UPDATE notifications SET status = 'expired', error = ? WHERE id = ?").run(
				'overdue, not sent',
				row.id
			);
			expired++;
			continue;
		}

		// Claim it, so a second tick cannot pick up the same row.
		const claimed = db
			.prepare("UPDATE notifications SET status = 'sending' WHERE id = ? AND status = 'pending'")
			.run(row.id).changes;
		if (!claimed) continue;

		const result = await sendSms(row.phone, row.body);

		if (result.ok) {
			db.prepare(
				`UPDATE notifications
				 SET status = 'sent', sent_at = datetime('now'), attempts = attempts + 1,
				     provider = ?, provider_id = ?, error = NULL
				 WHERE id = ?`
			).run(providerName(), result.id ?? null, row.id);
			sent++;
		} else {
			// Three tries, then it stays failed for a human to look at.
			const attempts = row.attempts + 1;
			db.prepare(
				`UPDATE notifications
				 SET status = ?, attempts = ?, error = ?, send_at = ?
				 WHERE id = ?`
			).run(
				attempts >= 3 ? 'failed' : 'pending',
				attempts,
				result.error ?? 'unknown error',
				Date.now() + 5 * 60 * 1000,
				row.id
			);
			failed++;
		}
	}

	return { sent, failed, expired, considered: rows.length };
}

let workerHandle = /** @type {NodeJS.Timeout | null} */ (null);

/**
 * Starts the once-a-minute drain. Guarded on globalThis so dev HMR cannot end
 * up with two workers racing over the same rows.
 *
 * @param {number} [intervalMs]
 */
export function startNotificationWorker(intervalMs = 60_000) {
	const g = /** @type {any} */ (globalThis);
	if (g.__chicanoSmsWorker) return g.__chicanoSmsWorker;

	const run = () =>
		tick().catch((err) => console.error('[sms worker]', err instanceof Error ? err.message : err));

	run();
	workerHandle = setInterval(run, intervalMs);
	workerHandle.unref?.();

	g.__chicanoSmsWorker = workerHandle;
	console.log(`[sms worker] started, provider "${providerName()}", every ${intervalMs / 1000}s`);
	return workerHandle;
}

export function stopNotificationWorker() {
	const g = /** @type {any} */ (globalThis);
	if (g.__chicanoSmsWorker) clearInterval(g.__chicanoSmsWorker);
	g.__chicanoSmsWorker = null;
	workerHandle = null;
}

/* ------------------------------------------------------------------ */
/* Broadcasts                                                          */
/* ------------------------------------------------------------------ */

/**
 * Who a force-majeure message would reach.
 *
 * @param {{ scope?: 'today' | 'date' | 'range' | 'upcoming', date?: string, until?: string, barberId?: number }} filter
 */
export function broadcastAudience(filter = {}) {
	const { scope = 'today', date, until, barberId } = filter;

	const clauses = ["a.status != 'cancelled'"];
	/** @type {any[]} */
	const params = [];

	if (scope === 'today') {
		clauses.push("a.date = date('now', 'localtime')");
	} else if (scope === 'date') {
		clauses.push('a.date = ?');
		params.push(date);
	} else if (scope === 'range') {
		clauses.push('a.date BETWEEN ? AND ?');
		params.push(date, until);
	} else {
		clauses.push("a.date >= date('now', 'localtime')");
	}

	if (barberId) {
		clauses.push('a.barber_id = ?');
		params.push(barberId);
	}

	return /** @type {any[]} */ (
		db
			.prepare(
				`SELECT a.id AS appointment_id, a.date, a.time, a.user_id,
				        s.title AS service, b.alias AS barber,
				        u.name AS client_name, u.phone AS client_phone, u.email AS client_email
				 FROM appointments a
				 JOIN services s ON s.id = a.service_id
				 JOIN barbers  b ON b.id = a.barber_id
				 JOIN users    u ON u.id = a.user_id
				 WHERE ${clauses.join(' AND ')}
				 ORDER BY a.date, a.time`
			)
			.all(...params)
	);
}

/**
 * Splits the audience into who can actually be reached and who cannot, so the
 * admin sees the cost of a missing phone number before pressing send.
 *
 * @param {Parameters<typeof broadcastAudience>[0]} filter
 * @param {string} template
 */
export function previewBroadcast(filter, template) {
	const audience = broadcastAudience(filter);

	/** @type {any[]} */
	const reachable = [];
	/** @type {any[]} */
	const unreachable = [];

	for (const row of audience) {
		const phone = normalizePhone(row.client_phone);
		const body = renderTemplate(template, {
			name: row.client_name,
			service: row.service,
			barber: row.barber,
			date: row.date,
			time: row.time,
			phone_shop: SHOP_PHONE
		});
		(phone ? reachable : unreachable).push({ ...row, phone, body });
	}

	return { reachable, unreachable, total: audience.length };
}

/**
 * Queues and immediately delivers a broadcast. Returns per-recipient results —
 * a force-majeure message is exactly when you want to know who was missed.
 *
 * @param {Parameters<typeof broadcastAudience>[0]} filter
 * @param {string} template
 */
export async function sendBroadcast(filter, template) {
	const { reachable, unreachable } = previewBroadcast(filter, template);
	const now = Date.now();

	const insert = db.prepare(
		`INSERT INTO notifications (appointment_id, user_id, kind, phone, body, send_at, status, error)
		 VALUES (?, ?, 'broadcast', ?, ?, ?, ?, ?)`
	);

	/** @type {number[]} */
	const queued = [];

	db.transaction(() => {
		for (const r of reachable) {
			queued.push(
				Number(insert.run(r.appointment_id, r.user_id, r.phone, r.body, now, 'pending', null).lastInsertRowid)
			);
		}
		for (const r of unreachable) {
			insert.run(r.appointment_id, r.user_id, null, r.body, now, 'skipped', 'client has no phone');
		}
	})();

	// Deliver straight away rather than waiting for the next tick.
	const result = await tick();

	return {
		queued: queued.length,
		skipped: unreachable.length,
		sent: result.sent,
		failed: result.failed
	};
}

/* ------------------------------------------------------------------ */
/* Reading the outbox                                                  */
/* ------------------------------------------------------------------ */

/** @param {{ status?: string, kind?: string, limit?: number }} [filter] */
export function listOutbox(filter = {}) {
	const { status, kind, limit = 100 } = filter;

	const clauses = ['1 = 1'];
	/** @type {any[]} */
	const params = [];
	if (status && status !== 'all') {
		clauses.push('n.status = ?');
		params.push(status);
	}
	if (kind && kind !== 'all') {
		clauses.push('n.kind = ?');
		params.push(kind);
	}
	params.push(limit);

	return /** @type {any[]} */ (
		db
			.prepare(
				`SELECT n.*, u.name AS client_name, u.email AS client_email,
				        a.date AS appt_date, a.time AS appt_time
				 FROM notifications n
				 LEFT JOIN users u ON u.id = n.user_id
				 LEFT JOIN appointments a ON a.id = n.appointment_id
				 WHERE ${clauses.join(' AND ')}
				 ORDER BY COALESCE(n.sent_at, n.created_at) DESC, n.id DESC
				 LIMIT ?`
			)
			.all(...params)
	);
}

export function outboxStats() {
	const rows = /** @type {{ status: string, n: number }[]} */ (
		db.prepare('SELECT status, COUNT(*) AS n FROM notifications GROUP BY status').all()
	);

	/** @type {Record<string, number>} */
	const byStatus = { pending: 0, sent: 0, failed: 0, skipped: 0, expired: 0, cancelled: 0, sending: 0 };
	for (const r of rows) byStatus[r.status] = r.n;

	const next = /** @type {{ send_at: number } | undefined} */ (
		db
			.prepare("SELECT send_at FROM notifications WHERE status = 'pending' ORDER BY send_at LIMIT 1")
			.get()
	);

	return { byStatus, total: rows.reduce((s, r) => s + r.n, 0), nextAt: next?.send_at ?? null };
}
