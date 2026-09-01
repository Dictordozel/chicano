import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/db.js';
import { SESSION_COOKIE } from '$lib/auth.js';

/** Nothing to render here — a stray GET just goes home. */
/** @type {import('./$types').PageServerLoad} */
export function load() {
	redirect(303, '/');
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ cookies }) => {
		destroySession(cookies.get(SESSION_COOKIE));
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
