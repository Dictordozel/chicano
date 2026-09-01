/**
 * Back-office queries. Kept apart from `db.js` so the public site never reaches
 * for a write it should not have.
 */
import { db, today, TIME_SLOTS } from './db.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** @type {Record<string, string>} */
const TRANSLIT = {
	а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
	и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
	с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
	щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

/**
 * URL-safe slug. Latin passes through, Cyrillic is transliterated — the shop's
 * product titles are mostly Russian.
 * @param {string} value
 */
export function slugify(value) {
	const out = value
		.toLowerCase()
		.split('')
		.map((ch) => TRANSLIT[ch] ?? ch)
		.join('')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return out || 'item';
}

/**
 * Appends -2, -3, … until the slug is free in that table. `exceptId` lets a row
 * keep its own slug while being edited.
 * @param {string} table
 * @param {string} base
 * @param {number | null} [exceptId]
 */
function uniqueSlug(table, base, exceptId = null) {
	const stmt =
		exceptId === null
			? db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`)
			: db.prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id != ?`);

	/** @param {string} candidate */
	const taken = (candidate) =>
		exceptId === null ? stmt.get(candidate) : stmt.get(candidate, exceptId);

	let slug = base;
	let n = 2;
	while (taken(slug)) slug = `${base}-${n++}`;
	return slug;
}

/** @param {string} table */
function nextSortOrder(table) {
	const row = /** @type {{ n: number | null }} */ (
		db.prepare(`SELECT MAX(sort_order) AS n FROM ${table}`).get()
	);
	return (row.n ?? 0) + 1;
}

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

/** @param {number} userId */
export function promoteToAdmin(userId) {
	db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(userId);
}

export function adminStats() {
	/** @param {string} sql @param {...any} args */
	const one = (sql, ...args) => /** @type {{ n: number | null }} */ (db.prepare(sql).get(...args)).n ?? 0;

	return {
		services: one('SELECT COUNT(*) AS n FROM services'),
		barbers: one('SELECT COUNT(*) AS n FROM barbers'),
		products: one('SELECT COUNT(*) AS n FROM products'),
		users: one('SELECT COUNT(*) AS n FROM users'),
		orders: one('SELECT COUNT(*) AS n FROM orders'),
		revenue: one('SELECT SUM(total) AS n FROM orders'),
		upcoming: one(
			"SELECT COUNT(*) AS n FROM appointments WHERE status != 'cancelled' AND date >= ?",
			today()
		),
		todayCount: one(
			"SELECT COUNT(*) AS n FROM appointments WHERE status != 'cancelled' AND date = ?",
			today()
		)
	};
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

/**
 * @param {{ title: string, category: string, tagline: string, description: string, duration_min: number, price: number, slug?: string }} input
 */
export function createService(input) {
	const slug = uniqueSlug('services', slugify(input.slug || input.title));
	const info = db
		.prepare(
			`INSERT INTO services (slug, category, title, tagline, description, duration_min, price, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			slug,
			input.category,
			input.title,
			input.tagline,
			input.description,
			input.duration_min,
			input.price,
			nextSortOrder('services')
		);
	return { id: Number(info.lastInsertRowid), slug };
}

/** @param {number} id */
export function getService(id) {
	return db.prepare('SELECT * FROM services WHERE id = ?').get(id) ?? null;
}

/**
 * @param {number} id
 * @param {{ title: string, category: string, tagline: string, description: string, duration_min: number, price: number, slug?: string }} input
 */
export function updateService(id, input) {
	const slug = uniqueSlug('services', slugify(input.slug || input.title), id);
	const changes = db
		.prepare(
			`UPDATE services
			 SET slug = ?, category = ?, title = ?, tagline = ?,
			     description = ?, duration_min = ?, price = ?
			 WHERE id = ?`
		)
		.run(
			slug,
			input.category,
			input.title,
			input.tagline,
			input.description,
			input.duration_min,
			input.price,
			id
		).changes;

	return { changes, slug };
}

/** Refuses while appointments still point at it — history must stay readable. */
/** @param {number} id */
export function deleteService(id) {
	const used = /** @type {{ n: number }} */ (
		db.prepare('SELECT COUNT(*) AS n FROM appointments WHERE service_id = ?').get(id)
	).n;
	if (used > 0) return { ok: false, used };
	db.prepare('DELETE FROM services WHERE id = ?').run(id);
	return { ok: true, used: 0 };
}

/* ------------------------------------------------------------------ */
/* Barbers                                                             */
/* ------------------------------------------------------------------ */

/**
 * @param {{ name: string, alias: string, specialty: string, bio: string, years: number, slug?: string }} input
 */
export function createBarber(input) {
	const slug = uniqueSlug('barbers', slugify(input.slug || input.alias || input.name));
	const info = db
		.prepare(
			`INSERT INTO barbers (slug, name, alias, specialty, bio, years, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			slug,
			input.name,
			input.alias,
			input.specialty,
			input.bio,
			input.years,
			nextSortOrder('barbers')
		);
	return { id: Number(info.lastInsertRowid), slug };
}

/** @param {number} id */
export function getBarber(id) {
	return db.prepare('SELECT * FROM barbers WHERE id = ?').get(id) ?? null;
}

/**
 * @param {number} id
 * @param {{ name: string, alias: string, specialty: string, bio: string, years: number, slug?: string }} input
 */
export function updateBarber(id, input) {
	const slug = uniqueSlug('barbers', slugify(input.slug || input.alias || input.name), id);
	const changes = db
		.prepare(
			`UPDATE barbers
			 SET slug = ?, name = ?, alias = ?, specialty = ?, bio = ?, years = ?
			 WHERE id = ?`
		)
		.run(slug, input.name, input.alias, input.specialty, input.bio, input.years, id).changes;

	return { changes, slug };
}

/** @param {number} id */
export function deleteBarber(id) {
	const used = /** @type {{ n: number }} */ (
		db.prepare('SELECT COUNT(*) AS n FROM appointments WHERE barber_id = ?').get(id)
	).n;
	if (used > 0) return { ok: false, used };
	db.prepare('DELETE FROM barbers WHERE id = ?').run(id);
	return { ok: true, used: 0 };
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

/**
 * @param {{ title: string, brand: string, category: string, price: number, volume: string | null, description: string, url: string, badge: string | null, slug?: string }} input
 */
export function createProduct(input) {
	const slug = uniqueSlug('products', slugify(input.slug || input.title));
	const info = db
		.prepare(
			`INSERT INTO products (slug, title, brand, category, price, volume, description, url, badge, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			slug,
			input.title,
			input.brand,
			input.category,
			input.price,
			input.volume,
			input.description,
			input.url,
			input.badge,
			nextSortOrder('products')
		);
	return { id: Number(info.lastInsertRowid), slug };
}

/** @param {number} id */
export function getProduct(id) {
	return db.prepare('SELECT * FROM products WHERE id = ?').get(id) ?? null;
}

/**
 * Editing a price does not touch orders already placed — those keep the frozen
 * copy of what the client actually paid.
 *
 * @param {number} id
 * @param {{ title: string, brand: string, category: string, price: number, volume: string | null, description: string, url: string, badge: string | null, slug?: string }} input
 */
export function updateProduct(id, input) {
	const slug = uniqueSlug('products', slugify(input.slug || input.title), id);
	const changes = db
		.prepare(
			`UPDATE products
			 SET slug = ?, title = ?, brand = ?, category = ?, price = ?,
			     volume = ?, description = ?, url = ?, badge = ?
			 WHERE id = ?`
		)
		.run(
			slug,
			input.title,
			input.brand,
			input.category,
			input.price,
			input.volume,
			input.description,
			input.url,
			input.badge,
			id
		).changes;

	return { changes, slug };
}

/** Cart rows cascade away; past orders keep their frozen JSON copy. */
/** @param {number} id */
export function deleteProduct(id) {
	db.prepare('DELETE FROM products WHERE id = ?').run(id);
	return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

/**
 * Everyone who has ever signed in or been booked in, with the numbers that
 * make a row worth keeping.
 * @param {string} [query] free-text match on name, email or phone
 */
export function listClients(query = '') {
	const like = `%${query.trim()}%`;
	return db
		.prepare(
			`SELECT u.id, u.email, u.name, u.phone, u.is_admin, u.created_at,
			        (SELECT COUNT(*) FROM appointments a
			           WHERE a.user_id = u.id AND a.status != 'cancelled')      AS bookings,
			        (SELECT COUNT(*) FROM appointments a WHERE a.user_id = u.id) AS bookings_all,
			        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id)       AS orders,
			        (SELECT COALESCE(SUM(o.total), 0) FROM orders o
			           WHERE o.user_id = u.id)                                   AS spent,
			        (SELECT MAX(a.date) FROM appointments a
			           WHERE a.user_id = u.id AND a.status != 'cancelled')       AS last_booking
			 FROM users u
			 WHERE ? = '' OR u.name LIKE ? OR u.email LIKE ? OR IFNULL(u.phone, '') LIKE ?
			 ORDER BY u.id DESC`
		)
		.all(query.trim(), like, like, like);
}

/** @param {number} id */
export function getClient(id) {
	const row = /** @type {any} */ (
		db.prepare('SELECT id, email, name, phone, is_admin FROM users WHERE id = ?').get(id)
	);
	if (!row) return null;
	return { id: row.id, email: row.email, name: row.name, phone: row.phone ?? '', is_admin: row.is_admin };
}

/**
 * @param {{ name: string, email: string, phone?: string }} input
 * @returns {{ ok: true, id: number } | { ok: false, reason: 'email-taken' }}
 */
export function createClient(input) {
	const email = input.email.trim().toLowerCase();
	if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
		return { ok: false, reason: 'email-taken' };
	}
	const info = db
		.prepare('INSERT INTO users (email, name, phone) VALUES (?, ?, ?)')
		.run(email, input.name.trim(), input.phone?.trim() || null);
	return { ok: true, id: Number(info.lastInsertRowid) };
}

/**
 * Email is the identity here — sign-in matches on it — so a collision has to be
 * refused rather than silently merged.
 *
 * @param {number} id
 * @param {{ name: string, email: string, phone?: string }} input
 * @returns {{ ok: true, changes: number } | { ok: false, reason: 'email-taken', holder: string }}
 */
export function updateClient(id, input) {
	const email = input.email.trim().toLowerCase();
	const clash = /** @type {{ name: string } | undefined} */ (
		db.prepare('SELECT name FROM users WHERE email = ? AND id != ?').get(email, id)
	);
	if (clash) return { ok: false, reason: 'email-taken', holder: clash.name };

	const changes = db
		.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?')
		.run(input.name.trim(), email, input.phone?.trim() || null, id).changes;

	return { ok: true, changes };
}

/**
 * Grants or revokes back-office rights.
 * @param {number} id
 * @param {boolean} grant
 */
export function setClientAdmin(id, grant) {
	return db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(grant ? 1 : 0, id).changes;
}

/** How many accounts currently hold back-office rights. */
export function countAdmins() {
	return /** @type {{ n: number }} */ (
		db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1').get()
	).n;
}

/**
 * Deleting a client would cascade their bookings away, so it is only allowed
 * once nothing of theirs is left on the books.
 * @param {number} id
 */
export function deleteClient(id) {
	const counts = /** @type {{ bookings: number, orders: number }} */ (
		db
			.prepare(
				`SELECT (SELECT COUNT(*) FROM appointments WHERE user_id = ?) AS bookings,
				        (SELECT COUNT(*) FROM orders       WHERE user_id = ?) AS orders`
			)
			.get(id, id)
	);
	if (counts.bookings > 0 || counts.orders > 0) return { ok: false, ...counts };

	db.prepare('DELETE FROM users WHERE id = ?').run(id);
	return { ok: true, ...counts };
}

/* ------------------------------------------------------------------ */
/* Appointments                                                        */
/* ------------------------------------------------------------------ */

/** @param {{ from?: string, limit?: number }} [options] */
export function listAllAppointments(options = {}) {
	const { from = today(), limit = 200 } = options;
	return db
		.prepare(
			`SELECT a.id, a.date, a.time, a.status, a.note,
			        s.title AS service, COALESCE(a.price, s.price) AS price, s.duration_min,
			        b.alias AS barber_alias, b.name AS barber_name,
			        u.name  AS client_name, u.email AS client_email, u.phone AS client_phone
			 FROM appointments a
			 JOIN services s ON s.id = a.service_id
			 JOIN barbers  b ON b.id = a.barber_id
			 JOIN users    u ON u.id = a.user_id
			 WHERE a.date >= ?
			 ORDER BY a.date, a.time
			 LIMIT ?`
		)
		.all(from, limit);
}

/**
 * Free slots on any date — the admin is not limited to the public 14-day window.
 * `exceptId` ignores one booking, so a booking being edited does not block its
 * own slot.
 *
 * @param {number} barberId
 * @param {string} date
 * @param {number | null} [exceptId]
 */
export function freeSlotsOn(barberId, date, exceptId = null) {
	const rows =
		exceptId === null
			? db
					.prepare(
						"SELECT time FROM appointments WHERE barber_id = ? AND date = ? AND status != 'cancelled'"
					)
					.all(barberId, date)
			: db
					.prepare(
						"SELECT time FROM appointments WHERE barber_id = ? AND date = ? AND status != 'cancelled' AND id != ?"
					)
					.all(barberId, date, exceptId);

	const taken = /** @type {{ time: string }[]} */ (rows).map((r) => r.time);
	return TIME_SLOTS.filter((t) => !taken.includes(t));
}

/** Availability for every barber over `days` days from `from`. */
/**
 * @param {string} from
 * @param {number} days
 * @param {number | null} [exceptId] booking to ignore, when one is being edited
 */
export function availabilityGrid(from, days, exceptId = null) {
	const barbers = /** @type {{ id: number }[]} */ (db.prepare('SELECT id FROM barbers').all());
	const [y, m, d] = from.split('-').map(Number);

	/** @type {string[]} */
	const dates = [];
	for (let i = 0; i < days; i++) {
		const dt = new Date(y, m - 1, d + i);
		dates.push(
			`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
				dt.getDate()
			).padStart(2, '0')}`
		);
	}

	/** @type {Record<number, Record<string, string[]>>} */
	const grid = {};
	for (const b of barbers) {
		grid[b.id] = {};
		for (const date of dates) grid[b.id][date] = freeSlotsOn(b.id, date, exceptId);
	}
	return { dates, grid };
}

/**
 * One booking shaped as the edit form expects it.
 * @param {number} id
 */
export function getAppointmentForEdit(id) {
	const row = /** @type {any} */ (
		db
			.prepare(
				`SELECT a.id, a.service_id, a.barber_id, a.date, a.time, a.note, a.status, a.price,
				        u.email AS client_email, u.name AS client_name, u.phone AS client_phone
				 FROM appointments a JOIN users u ON u.id = a.user_id
				 WHERE a.id = ?`
			)
			.get(id)
	);
	if (!row) return null;

	return {
		id: row.id,
		email: row.client_email,
		name: row.client_name,
		phone: row.client_phone ?? '',
		serviceId: row.service_id,
		barberId: row.barber_id,
		date: row.date,
		time: row.time,
		note: row.note ?? '',
		status: row.status,
		price: row.price
	};
}

/**
 * @param {number} id
 * @param {{ userId: number, serviceId: number, barberId: number, date: string, time: string, note?: string }} input
 */
export function updateAppointment(id, { userId, serviceId, barberId, date, time, note }) {
	const current = /** @type {{ service_id: number, price: number | null } | undefined} */ (
		db.prepare('SELECT service_id, price FROM appointments WHERE id = ?').get(id)
	);
	if (!current) return { changes: 0, price: null };

	// Re-quote only when the service itself changes. Moving a booking to another
	// day or barber must not silently reprice what the client was told.
	const price =
		current.service_id === serviceId
			? current.price
			: (/** @type {{ price: number } | undefined} */ (
					db.prepare('SELECT price FROM services WHERE id = ?').get(serviceId)
				)?.price ?? null);

	const changes = db
		.prepare(
			`UPDATE appointments
			 SET user_id = ?, service_id = ?, barber_id = ?, date = ?, time = ?, note = ?, price = ?
			 WHERE id = ?`
		)
		.run(userId, serviceId, barberId, date, time, note?.trim() || null, price, id).changes;

	return { changes, price };
}

/** @param {number} id */
export function deleteAppointment(id) {
	return db.prepare('DELETE FROM appointments WHERE id = ?').run(id).changes;
}

/** @param {number} id @param {string} status */
export function setAppointmentStatus(id, status) {
	return db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id).changes;
}
