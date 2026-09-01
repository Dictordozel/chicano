import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireUser } from '$lib/server/guard.js';
import { promoteToAdmin } from '$lib/server/admin.js';

/** Prototype gate. Set ADMIN_PASSCODE in .env to change it. */
const PASSCODE = env.ADMIN_PASSCODE || 'chicano';

/** @param {string | null} value */
const safeNext = (value) =>
	value && value.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	const user = requireUser(locals, url);
	const next = safeNext(url.searchParams.get('next'));

	if (user.is_admin) redirect(303, next);
	return { next };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, url }) => {
		const user = requireUser(locals, url);
		const form = await request.formData();
		const next = safeNext(String(form.get('next') ?? ''));

		if (String(form.get('passcode') ?? '').trim() !== PASSCODE) {
			return fail(403, { error: 'Wrong passcode.' });
		}

		promoteToAdmin(user.id);
		redirect(303, next);
	}
};
