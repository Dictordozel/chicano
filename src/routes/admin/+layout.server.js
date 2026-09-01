import { requireUser } from '$lib/server/guard.js';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals, url }) {
	// Sign-in only: each admin page guards its own data with `requireAdmin`.
	const user = requireUser(locals, url);
	return { isAdmin: Boolean(user.is_admin) };
}
