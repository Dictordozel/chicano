import { listServices, listBarbers, listProducts } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	const products = /** @type {any[]} */ (listProducts());

	return {
		services: listServices(),
		barbers: listBarbers(),
		featured: products.slice(0, 3)
	};
}
