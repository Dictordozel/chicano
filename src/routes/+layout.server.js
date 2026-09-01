import { cartCount } from '$lib/server/db.js';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	return {
		user: locals.user,
		cartCount: cartCount(locals.cartKey)
	};
}
