import { building } from '$app/environment';
import { userFromSession } from '$lib/server/db.js';
import { SESSION_COOKIE, CART_COOKIE } from '$lib/auth.js';
import { startNotificationWorker } from '$lib/server/notifications.js';

// One drain loop per server process. Skipped during build, where there is no
// server to run it.
if (!building) startNotificationWorker();

/**
 * Resolves the simulated session and the (guest-friendly) cart key on every
 * request, so routes can read `locals.user` / `locals.cartKey` directly.
 *
 * @type {import('@sveltejs/kit').Handle}
 */
export async function handle({ event, resolve }) {
	event.locals.user = userFromSession(event.cookies.get(SESSION_COOKIE));

	// A cart survives without an account — the shop must work for walk-ins too.
	let cartKey = event.cookies.get(CART_COOKIE);
	if (!cartKey) {
		cartKey = crypto.randomUUID();
		event.cookies.set(CART_COOKIE, cartKey, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			// SvelteKit defaults to `secure: true`, which a browser drops over plain
			// http on a LAN address — keep the prototype usable on a phone.
			secure: event.url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 90
		});
	}
	event.locals.cartKey = cartKey;

	return resolve(event);
}
