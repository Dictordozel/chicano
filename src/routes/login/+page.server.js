import { fail, redirect } from '@sveltejs/kit';
import { findOrCreateUser, createSession } from '$lib/server/db.js';
import { SESSION_COOKIE } from '$lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow same-origin, absolute-path redirects. */
function safeNext(/** @type {string | null} */ value) {
	return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	return { next: safeNext(url.searchParams.get('next')) };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		const phone = String(form.get('phone') ?? '').trim();
		const next = safeNext(String(form.get('next') ?? url.searchParams.get('next') ?? ''));

		/** @type {Record<string, string>} */
		const errors = {};
		if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
		if (name.length < 2) errors.name = 'Tell us what to call you.';
		if (phone && phone.replace(/\D/g, '').length < 10) errors.phone = 'That phone looks too short.';

		if (Object.keys(errors).length) {
			return fail(400, { errors, values: { email, name, phone } });
		}

		// Simulated auth: no password, the email is the identity.
		const user = findOrCreateUser(email, name, phone);
		const session = createSession(user.id);

		cookies.set(SESSION_COOKIE, session.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 30
		});

		redirect(303, next);
	}
};
