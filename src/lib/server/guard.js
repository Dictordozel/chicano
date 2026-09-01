import { redirect } from '@sveltejs/kit';

/**
 * Requires a signed-in visitor.
 * @param {App.Locals} locals
 * @param {URL} url
 */
export function requireUser(locals, url) {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	return locals.user;
}

/**
 * Requires back-office rights. Called by every admin page load — a layout load
 * cannot protect its children, since their loads run regardless.
 * @param {App.Locals} locals
 * @param {URL} url
 */
export function requireAdmin(locals, url) {
	const user = requireUser(locals, url);
	if (!user.is_admin) {
		redirect(303, `/admin/unlock?next=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return user;
}
