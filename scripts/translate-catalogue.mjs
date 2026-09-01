/**
 * One-off: moves the shop catalogue from the Russian copy it was seeded with to
 * English, matching the rest of the interface. Run against an existing database
 * so the change lands without a reset:
 *
 *   node scripts/translate-catalogue.mjs
 *
 * A fresh database gets the English copy straight from the seed in db.js.
 */
import { db } from '../src/lib/server/db.js';

/**
 * Keyed by the slug the row was seeded with. New slugs are spelled out rather
 * than derived: `slugify` turns the apostrophe in "Morgan's" into a hyphen, and
 * the seed in db.js does not, so deriving them here would quietly drift apart.
 */
const TRANSLATIONS = {
	'suavecito-firme-hold': {
		slug: 'suavecito-firme-hold-pomade',
		title: 'Suavecito Firme Hold Pomade',
		category: 'Hair',
		volume: '113 g',
		description:
			'Firm hold with a moderate shine, built for the classic Latin cuts. Water-soluble, so it washes out clean.'
	},
	'morgans-beard-oil': {
		slug: 'morgans-beard-moustache-oil',
		title: 'Morgan’s Beard & Moustache Oil',
		category: 'Beard',
		volume: '50 ml',
		description:
			'Premium oil that softens coarse stubble and looks after the skin beneath it. Bergamot and sandalwood.'
	},
	'reuzel-extreme-hold-matte': {
		slug: 'reuzel-extreme-hold-matte-clay',
		title: 'Reuzel Extreme Hold Matte Clay',
		category: 'Hair',
		volume: '113 g',
		description: 'Maximum matte hold with no shine at all, for a brutal textured finish.'
	},
	'clubman-pinaud-2in1': {
		slug: 'clubman-pinaud-2-in-1-beard-balm',
		title: 'Clubman Pinaud 2-in-1 Beard Balm',
		category: 'Face & beard',
		volume: '59 ml',
		description:
			'Moisturises the skin and tames the beard, taking the frizz out of it. The classic barbershop scent.'
	},
	'proraso-pre-shave-green': {
		slug: 'proraso-pre-shave-cream-green',
		title: 'Proraso Pre-Shave Cream, Green',
		category: 'Face',
		volume: '100 ml',
		description:
			'Eucalyptus and menthol lift the stubble and cool the skin before a straight razor. A barbershop staple since 1948.'
	},
	'baxter-after-shave-balm': {
		slug: 'baxter-of-california-after-shave-balm',
		title: 'Baxter of California After-Shave Balm',
		category: 'Face',
		volume: '120 ml',
		description:
			'Calms the burn after a shave without leaving a sticky film. Aloe, allantoin and glycerin.'
	}
};

const update = db.prepare(
	'UPDATE products SET title = ?, category = ?, volume = ?, description = ?, slug = ? WHERE slug = ?'
);

let changed = 0;
db.transaction(() => {
	for (const [oldSlug, t] of Object.entries(TRANSLATIONS)) {
		const row = db.prepare('SELECT id FROM products WHERE slug = ?').get(oldSlug);
		if (!row) {
			console.log(`  skipped (not found): ${oldSlug}`);
			continue;
		}
		// The old slugs were transliterated from Russian titles, so they change too.
		update.run(t.title, t.category, t.volume, t.description, t.slug, oldSlug);
		changed++;
	}
})();

console.log(`\n${changed} products translated\n`);
for (const p of db.prepare('SELECT slug, category, price, title FROM products ORDER BY sort_order').all()) {
	console.log(`  ${String(p.price).padStart(4)} ₽  [${p.category.padEnd(12)}]  ${p.title}`);
	console.log(`        ${p.slug}`);
}
