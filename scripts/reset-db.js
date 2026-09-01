import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'data');
for (const f of ['chicano.db', 'chicano.db-wal', 'chicano.db-shm']) {
	const p = path.join(dir, f);
	if (existsSync(p)) {
		rmSync(p);
		console.log('removed', f);
	}
}
await import('../src/lib/server/db.js');
console.log('database recreated and seeded');
