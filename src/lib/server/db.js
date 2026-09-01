import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chicano.db');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  phone       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  category     TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  tagline      TEXT    NOT NULL,
  description  TEXT    NOT NULL,
  duration_min INTEGER NOT NULL,
  price        INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS barbers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  alias       TEXT    NOT NULL,
  specialty   TEXT    NOT NULL,
  bio         TEXT    NOT NULL,
  years       INTEGER NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS appointments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id  INTEGER NOT NULL REFERENCES services(id),
  barber_id   INTEGER NOT NULL REFERENCES barbers(id),
  date        TEXT    NOT NULL,
  time        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'confirmed',
  note        TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (barber_id, date, time)
);

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  brand        TEXT    NOT NULL,
  category     TEXT    NOT NULL,
  price        INTEGER NOT NULL,
  volume       TEXT,
  description  TEXT    NOT NULL,
  url          TEXT    NOT NULL,
  badge        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cart_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_key    TEXT    NOT NULL,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 1,
  added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cart_key, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cart_key    TEXT    NOT NULL,
  total       INTEGER NOT NULL,
  items_json  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments (barber_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_key         ON cart_items (cart_key);
`);

/* ------------------------------------------------------------------ */
/* Migrations                                                          */
/* ------------------------------------------------------------------ */

/**
 * Adds a column to an existing table when it is missing, so databases created
 * before a schema change keep working without a manual reset.
 *
 * @param {string} table
 * @param {string} column
 * @param {string} ddl full column definition
 */
function ensureColumn(table, column, ddl) {
	const cols = /** @type {{ name: string }[]} */ (db.prepare(`PRAGMA table_info(${table})`).all());
	if (!cols.some((c) => c.name === column)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
	}
}

ensureColumn('users', 'is_admin', 'is_admin INTEGER NOT NULL DEFAULT 0');

// Price is frozen onto the booking, so editing a service later does not rewrite
// what a client was quoted. Rows created before this column fall back to the
// service's current price via COALESCE.
ensureColumn('appointments', 'price', 'price INTEGER');

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

/** Opening grid — every chair, every day. */
export const TIME_SLOTS = [
	'10:00',
	'11:00',
	'12:00',
	'13:00',
	'14:00',
	'15:00',
	'16:00',
	'17:00',
	'18:00',
	'19:00',
	'20:00'
];

const SERVICES = [
	{
		slug: 'slicked-back',
		category: 'hair',
		title: 'Slicked Back',
		tagline: 'The Chicano signature',
		description:
			'Tight sides, long top, combed back hard and locked with firm-hold pomade. The silhouette that started it all.',
		duration_min: 50,
		price: 2400,
		sort_order: 1
	},
	{
		slug: 'classic-pompadour',
		category: 'hair',
		title: 'Classic Pompadour',
		tagline: 'Old-school volume',
		description:
			'Scissor-built classic with a sculpted front lift and a clean taper. Shear work only, no clipper shortcuts.',
		duration_min: 60,
		price: 2600,
		sort_order: 2
	},
	{
		slug: 'skin-fade',
		category: 'hair',
		title: 'Low Skin Fade',
		tagline: 'Razor-clean gradient',
		description:
			'Blade-to-skin gradient blended into the length, finished with a straight-razor outline at the neck and temples.',
		duration_min: 45,
		price: 2200,
		sort_order: 3
	},
	{
		slug: 'buzz-crop',
		category: 'hair',
		title: 'Buzz & Crop',
		tagline: 'Short, sharp, done',
		description:
			'A single-guard cut with a hand-worked neckline. Fast, brutal and honest, the working-man standard.',
		duration_min: 30,
		price: 1500,
		sort_order: 4
	},
	{
		slug: 'beard-moustache-sculpt',
		category: 'beard',
		title: 'Beard & Moustache Sculpt',
		tagline: 'Lines you can measure',
		description:
			'Full beard shaping with clipper and shear, straight-razor cheek and neck lines, moustache trimmed to the lip.',
		duration_min: 40,
		price: 1600,
		sort_order: 5
	},
	{
		slug: 'royal-shave',
		category: 'beard',
		title: 'Royal Hot-Towel Shave',
		tagline: 'Steel and steam',
		description:
			'Hot towels, badger-brush lather, two passes with an open straight razor, cold towel and balm to close.',
		duration_min: 45,
		price: 1900,
		sort_order: 6
	},
	{
		slug: 'moustache-detail',
		category: 'beard',
		title: 'Moustache Detail',
		tagline: 'Handlebar territory',
		description:
			'Precision trim and wax-set for a handlebar, chevron or horseshoe. Fifteen minutes that change a face.',
		duration_min: 20,
		price: 900,
		sort_order: 7
	},
	{
		slug: 'cut-and-beard',
		category: 'beard',
		title: 'Cut + Beard Combo',
		tagline: 'The full ritual',
		description:
			'Any haircut from the list paired with a full beard sculpt. The whole head handled in one sitting.',
		duration_min: 80,
		price: 3600,
		sort_order: 8
	}
];

const BARBERS = [
	{
		slug: 'el-toro',
		name: 'Ramon Vega',
		alias: 'El Toro',
		specialty: 'Slick backs & pompadours',
		bio: 'Fifteen years behind the chair. Learned the comb-back in a garage shop in Boyle Heights.',
		years: 15,
		sort_order: 1
	},
	{
		slug: 'la-navaja',
		name: 'Diego Solis',
		alias: 'La Navaja',
		specialty: 'Straight-razor work & fades',
		bio: 'Straight razor in one hand, rosary in the other. If the line is not dead straight, he starts again.',
		years: 11,
		sort_order: 2
	},
	{
		slug: 'el-santo',
		name: 'Marco Ibarra',
		alias: 'El Santo',
		specialty: 'Beard architecture',
		bio: 'Beard specialist. Treats every jawline like a commission and every moustache like a signature.',
		years: 9,
		sort_order: 3
	},
	{
		slug: 'la-reina',
		name: 'Selena Cruz',
		alias: 'La Reina',
		specialty: 'Classic scissor cuts',
		bio: 'Pure shear work, no clippers unless the cut demands it. The fastest hands in the shop.',
		years: 8,
		sort_order: 4
	}
];

/**
 * Shop catalogue. The first four entries are the client-supplied demo goods —
 * titles, categories, prices, descriptions and marketplace links kept verbatim.
 * The last two round out the face-care shelf.
 */
const PRODUCTS = [
	{
		slug: 'suavecito-firme-hold',
		title: 'Помада для укладки волос Suavecito Firme Hold',
		brand: 'Suavecito',
		category: 'Волосы',
		price: 1650,
		volume: '113 г',
		description:
			'Сильная фиксация с умеренным блеском для классических латиноамериканских мужских стрижек. Водорастворимая.',
		url: 'https://ozon.ru',
		badge: 'Slick Back',
		sort_order: 1
	},
	{
		slug: 'morgans-beard-oil',
		title: 'Масло для бороды и усов Morgan’s Beard Oil',
		brand: 'Morgan’s',
		category: 'Борода',
		price: 2100,
		volume: '50 мл',
		description:
			'Премиальное масло для смягчения жесткой щетины и ухода за кожей лица. Аромат бергамота и сандала.',
		url: 'https://ozon.ru',
		badge: 'Premium',
		sort_order: 2
	},
	{
		slug: 'reuzel-extreme-hold-matte',
		title: 'Глина-мастика для волос Reuzel Extreme Hold Matte',
		brand: 'Reuzel',
		category: 'Волосы',
		price: 1980,
		volume: '113 г',
		description:
			'Максимальная матовая фиксация без лишнего блеска для брутального текстурного стиля.',
		url: 'https://ozon.ru',
		badge: 'Matte',
		sort_order: 3
	},
	{
		slug: 'clubman-pinaud-2in1',
		title: 'Бальзам для бороды Clubman Pinaud 2-in-1',
		brand: 'Clubman Pinaud',
		category: 'Лицо и борода',
		price: 1250,
		volume: '59 мл',
		description:
			'Увлажняет кожу лица и делает бороду послушной, убирая пушистость. Классический аромат барбершопа.',
		url: 'https://ozon.ru',
		badge: 'Classic',
		sort_order: 4
	},
	{
		slug: 'proraso-pre-shave-green',
		title: 'Крем до бритья Proraso Pre-Shave Green',
		brand: 'Proraso',
		category: 'Лицо',
		price: 1390,
		volume: '100 мл',
		description:
			'Эвкалипт и ментол поднимают щетину и охлаждают кожу перед бритьем опасной бритвой. Барберская классика с 1948 года.',
		url: 'https://ozon.ru',
		badge: null,
		sort_order: 5
	},
	{
		slug: 'baxter-after-shave-balm',
		title: 'Бальзам после бритья Baxter of California',
		brand: 'Baxter of California',
		category: 'Лицо',
		price: 2450,
		volume: '120 мл',
		description:
			'Успокаивает раздражение после бритья, не оставляет липкой пленки. Алоэ, аллантоин и глицерин.',
		url: 'https://ozon.ru',
		badge: null,
		sort_order: 6
	}
];

/** Insert seed rows only when a table is still empty — safe to run on every boot. */
function seed() {
	/** @param {string} table */
	const count = (table) =>
		/** @type {{ n: number }} */ (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).n;

	if (count('services') === 0) {
		const stmt = db.prepare(
			`INSERT INTO services (slug, category, title, tagline, description, duration_min, price, sort_order)
			 VALUES (@slug, @category, @title, @tagline, @description, @duration_min, @price, @sort_order)`
		);
		db.transaction(() => SERVICES.forEach((r) => stmt.run(r)))();
	}

	if (count('barbers') === 0) {
		const stmt = db.prepare(
			`INSERT INTO barbers (slug, name, alias, specialty, bio, years, sort_order)
			 VALUES (@slug, @name, @alias, @specialty, @bio, @years, @sort_order)`
		);
		db.transaction(() => BARBERS.forEach((r) => stmt.run(r)))();
	}

	if (count('products') === 0) {
		const stmt = db.prepare(
			`INSERT INTO products (slug, title, brand, category, price, volume, description, url, badge, sort_order)
			 VALUES (@slug, @title, @brand, @category, @price, @volume, @description, @url, @badge, @sort_order)`
		);
		db.transaction(() => PRODUCTS.forEach((r) => stmt.run(r)))();
	}

	// A demo regular plus a handful of taken slots, so the booking grid looks alive.
	if (count('users') === 0) {
		// Deliberately not an admin: sign-in is simulated, so anyone could type
		// this address. The back office is reached through the passcode instead.
		const demoId = Number(
			db
				.prepare('INSERT INTO users (email, name, phone) VALUES (?, ?, ?)')
				.run('demo@chicano.shop', 'Demo Client', '+7 900 000-00-00').lastInsertRowid
		);

		const insert = db.prepare(
			`INSERT OR IGNORE INTO appointments (user_id, service_id, barber_id, date, time, status, price)
			 VALUES (?, ?, ?, ?, ?, 'confirmed', (SELECT price FROM services WHERE id = ?))`
		);
		const serviceIds = /** @type {{ id: number }[]} */ (
			db.prepare('SELECT id FROM services').all()
		).map((r) => r.id);
		const barberIds = /** @type {{ id: number }[]} */ (
			db.prepare('SELECT id FROM barbers').all()
		).map((r) => r.id);

		// Deterministic pseudo-noise: each barber loses ~3 slots a day for 14 days.
		db.transaction(() => {
			for (let day = 0; day < 14; day++) {
				const date = addDays(today(), day);
				barberIds.forEach((barberId, bi) => {
					for (let k = 0; k < 3; k++) {
						const idx = (day * 7 + bi * 5 + k * 3 + 2) % TIME_SLOTS.length;
						const serviceId = serviceIds[(day + bi + k) % serviceIds.length];
						insert.run(demoId, serviceId, barberId, date, TIME_SLOTS[idx], serviceId);
					}
				});
			}
		})();
	}
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

/** @param {Date} d */
export function toISODate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** @returns {string} today as YYYY-MM-DD in local time */
export function today() {
	return toISODate(new Date());
}

/**
 * @param {string} iso YYYY-MM-DD
 * @param {number} n days to add
 */
export function addDays(iso, n) {
	const [y, m, d] = iso.split('-').map(Number);
	return toISODate(new Date(y, m - 1, d + n));
}

/** Fourteen bookable days starting today. */
export function bookableDates() {
	const start = today();
	return Array.from({ length: 14 }, (_, i) => addDays(start, i));
}

seed();

/* ------------------------------------------------------------------ */
/* Queries — auth                                                      */
/* ------------------------------------------------------------------ */

/**
 * @param {string} email
 * @param {string} name
 * @param {string} [phone]
 */
export function findOrCreateUser(email, name, phone) {
	const normalized = email.trim().toLowerCase();
	const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);

	if (existing) {
		db.prepare(
			`UPDATE users
			 SET name  = COALESCE(NULLIF(?, ''), name),
			     phone = COALESCE(NULLIF(?, ''), phone)
			 WHERE email = ?`
		).run(name?.trim() ?? '', phone?.trim() ?? '', normalized);
	} else {
		db.prepare('INSERT INTO users (email, name, phone) VALUES (?, ?, ?)').run(
			normalized,
			name.trim(),
			phone?.trim() || null
		);
	}

	return /** @type {{ id: number, email: string, name: string, phone: string | null }} */ (
		db.prepare('SELECT * FROM users WHERE email = ?').get(normalized)
	);
}

/** @param {number} userId */
export function createSession(userId) {
	const id = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
	db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
		id,
		userId,
		expiresAt.toISOString().slice(0, 19).replace('T', ' ')
	);
	return { id, expiresAt };
}

/** @param {string | undefined} sessionId */
export function userFromSession(sessionId) {
	if (!sessionId) return null;
	const row = db
		.prepare(
			`SELECT u.id, u.email, u.name, u.phone, u.is_admin
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ? AND s.expires_at > datetime('now')`
		)
		.get(sessionId);
	return /** @type {{ id: number, email: string, name: string, phone: string | null, is_admin: number } | null} */ (
		row ?? null
	);
}

/** @param {string | undefined} sessionId */
export function destroySession(sessionId) {
	if (sessionId) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/* ------------------------------------------------------------------ */
/* Queries — catalogue                                                 */
/* ------------------------------------------------------------------ */

export function listServices() {
	return db.prepare('SELECT * FROM services ORDER BY sort_order').all();
}

export function listBarbers() {
	return db.prepare('SELECT * FROM barbers ORDER BY sort_order').all();
}

export function listProducts() {
	return db.prepare('SELECT * FROM products ORDER BY sort_order').all();
}

/* ------------------------------------------------------------------ */
/* Queries — booking                                                   */
/* ------------------------------------------------------------------ */

/**
 * Availability across the whole bookable window for one barber.
 * @param {number} barberId
 * @returns {Record<string, string[]>} date -> free times
 */
export function availabilityFor(barberId) {
	const dates = bookableDates();
	const rows = /** @type {{ date: string; time: string }[]} */ (
		db
			.prepare(
				`SELECT date, time FROM appointments
				 WHERE barber_id = ? AND status != 'cancelled' AND date BETWEEN ? AND ?`
			)
			.all(barberId, dates[0], dates[dates.length - 1])
	);

	/** @type {Record<string, Set<string>>} */
	const taken = {};
	for (const r of rows) (taken[r.date] ??= new Set()).add(r.time);

	const nowHM = new Date().toTimeString().slice(0, 5);

	/** @type {Record<string, string[]>} */
	const free = {};
	for (const date of dates) {
		free[date] = TIME_SLOTS.filter((t) => {
			if (taken[date]?.has(t)) return false;
			// Slots that already passed today are not bookable.
			if (date === dates[0] && t <= nowHM) return false;
			return true;
		});
	}
	return free;
}

/**
 * @param {{ userId: number, serviceId: number, barberId: number, date: string, time: string, note?: string }} input
 */
export function createAppointment({ userId, serviceId, barberId, date, time, note }) {
	const quoted = /** @type {{ price: number } | undefined} */ (
		db.prepare('SELECT price FROM services WHERE id = ?').get(serviceId)
	)?.price;

	const info = db
		.prepare(
			`INSERT INTO appointments (user_id, service_id, barber_id, date, time, note, price)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.run(userId, serviceId, barberId, date, time, note?.trim() || null, quoted ?? null);
	return Number(info.lastInsertRowid);
}

/** @param {number} id */
export function getAppointment(id) {
	return db
		.prepare(
			`SELECT a.id, a.date, a.time, a.status, a.note,
			        s.title AS service, COALESCE(a.price, s.price) AS price, s.duration_min,
			        b.alias AS barber_alias, b.name AS barber_name
			 FROM appointments a
			 JOIN services s ON s.id = a.service_id
			 JOIN barbers  b ON b.id = a.barber_id
			 WHERE a.id = ?`
		)
		.get(id);
}

/** @param {number} userId */
export function listAppointments(userId) {
	return db
		.prepare(
			`SELECT a.id, a.date, a.time, a.status, a.note,
			        s.title AS service, COALESCE(a.price, s.price) AS price, s.duration_min,
			        b.alias AS barber_alias, b.name AS barber_name
			 FROM appointments a
			 JOIN services s ON s.id = a.service_id
			 JOIN barbers  b ON b.id = a.barber_id
			 WHERE a.user_id = ?
			 ORDER BY a.date DESC, a.time DESC`
		)
		.all(userId);
}

/**
 * @param {number} id
 * @param {number} userId
 */
export function cancelAppointment(id, userId) {
	return db
		.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ? AND user_id = ?")
		.run(id, userId).changes;
}

/* ------------------------------------------------------------------ */
/* Queries — cart                                                      */
/* ------------------------------------------------------------------ */

/**
 * @param {string} cartKey
 * @param {number} productId
 * @param {number} [qty]
 */
export function addToCart(cartKey, productId, qty = 1) {
	db.prepare(
		`INSERT INTO cart_items (cart_key, product_id, qty) VALUES (?, ?, ?)
		 ON CONFLICT (cart_key, product_id) DO UPDATE SET qty = qty + excluded.qty`
	).run(cartKey, productId, qty);
}

/**
 * @param {string} cartKey
 * @param {number} productId
 * @param {number} qty
 */
export function setCartQty(cartKey, productId, qty) {
	if (qty <= 0) {
		db.prepare('DELETE FROM cart_items WHERE cart_key = ? AND product_id = ?').run(
			cartKey,
			productId
		);
	} else {
		db.prepare('UPDATE cart_items SET qty = ? WHERE cart_key = ? AND product_id = ?').run(
			Math.min(qty, 99),
			cartKey,
			productId
		);
	}
}

/**
 * @param {string} cartKey
 * @param {number} productId
 */
export function removeFromCart(cartKey, productId) {
	db.prepare('DELETE FROM cart_items WHERE cart_key = ? AND product_id = ?').run(cartKey, productId);
}

/**
 * @param {string | undefined} cartKey
 * @returns {{ id: number, qty: number, title: string, brand: string, category: string, price: number, volume: string | null, url: string, slug: string }[]}
 */
export function listCart(cartKey) {
	if (!cartKey) return [];
	return /** @type {any} */ (
		db
			.prepare(
				`SELECT c.product_id AS id, c.qty, p.title, p.brand, p.category, p.price, p.volume, p.url, p.slug
				 FROM cart_items c JOIN products p ON p.id = c.product_id
				 WHERE c.cart_key = ?
				 ORDER BY c.added_at`
			)
			.all(cartKey)
	);
}

/** @param {string | undefined} cartKey */
export function cartCount(cartKey) {
	if (!cartKey) return 0;
	const row = /** @type {{ n: number | null }} */ (
		db.prepare('SELECT SUM(qty) AS n FROM cart_items WHERE cart_key = ?').get(cartKey)
	);
	return row?.n ?? 0;
}

/**
 * Simulated purchase: freeze the cart into an order row and empty it.
 * @param {string} cartKey
 * @param {number | null} userId
 */
export function checkout(cartKey, userId) {
	const items = listCart(cartKey);
	if (items.length === 0) return null;

	const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
	const info = db
		.prepare('INSERT INTO orders (user_id, cart_key, total, items_json) VALUES (?, ?, ?, ?)')
		.run(userId, cartKey, total, JSON.stringify(items));
	db.prepare('DELETE FROM cart_items WHERE cart_key = ?').run(cartKey);

	return { id: Number(info.lastInsertRowid), total, count: items.length };
}

/** @param {number} userId */
export function listOrders(userId) {
	return /** @type {{ id: number, total: number, items_json: string, created_at: string }[]} */ (
		db
			.prepare('SELECT id, total, items_json, created_at FROM orders WHERE user_id = ? ORDER BY id DESC')
			.all(userId)
	);
}
