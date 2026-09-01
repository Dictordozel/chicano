/**
 * Pulls the woff2 files Google would have served and writes a local @font-face
 * sheet, so the app stops depending on a third-party origin.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/Alex/Desktop/chicano';
const OUT_DIR = path.join(ROOT, 'static/fonts');
mkdirSync(OUT_DIR, { recursive: true });

const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Only the weights the app actually uses.
const CSS_URL =
	'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Oswald:wght@500;600&family=Inter:wght@400;500;600&display=swap';

// Greek and Vietnamese are dead weight for a Russian barbershop.
const KEEP = new Set(['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']);

const css = await (await fetch(CSS_URL, { headers: { 'user-agent': UA } })).text();

/** Split the sheet into `/* subset *\/ @font-face {...}` pairs. */
const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)].map(
	([, subset, face]) => ({ subset, face })
);

const field = (face, name) => face.match(new RegExp(name + ':\\s*([^;]+);'))?.[1]?.trim();

/** @type {Map<string, string>} remote url -> local filename */
const files = new Map();
const rules = [];

for (const { subset, face } of blocks) {
	if (!KEEP.has(subset)) continue;

	const family = field(face, 'font-family').replace(/['"]/g, '');
	const weight = field(face, 'font-weight');
	const style = field(face, 'font-style') ?? 'normal';
	const range = field(face, 'unicode-range');
	const url = face.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
	if (!url) continue;

	// Variable fonts serve one file per subset for every weight — download once.
	if (!files.has(url)) {
		const slug = family.toLowerCase().replace(/\s+/g, '-');
		files.set(url, `${slug}-${subset}.woff2`);
	}

	rules.push(
		`@font-face {\n` +
			`\tfont-family: '${family}';\n` +
			`\tfont-style: ${style};\n` +
			`\tfont-weight: ${weight};\n` +
			`\tfont-display: swap;\n` +
			`\tsrc: url('/fonts/${files.get(url)}') format('woff2');\n` +
			`\tunicode-range: ${range};\n` +
			`}`
	);
}

let total = 0;
for (const [url, name] of files) {
	const buf = Buffer.from(await (await fetch(url, { headers: { 'user-agent': UA } })).arrayBuffer());
	writeFileSync(path.join(OUT_DIR, name), buf);
	total += buf.length;
	console.log(`  ${(buf.length / 1024).toFixed(0).padStart(4)} KB  ${name}`);
}

const sheet =
	`/*\n` +
	` * Self-hosted webfonts. Generated from Google Fonts, then served from our own\n` +
	` * origin: no third-party DNS, TLS or round-trip in front of first paint.\n` +
	` * Only the weights the app uses, and only Latin + Cyrillic subsets.\n` +
	` *\n` +
	` * Regenerate with scripts/fetch-fonts.mjs after changing weights.\n` +
	` */\n\n` +
	rules.join('\n\n') +
	'\n';

writeFileSync(path.join(ROOT, 'src/fonts.css'), sheet, 'utf8');

console.log(`\n  ${files.size} files, ${(total / 1024).toFixed(0)} KB total`);
console.log(`  ${rules.length} @font-face rules -> src/fonts.css`);
