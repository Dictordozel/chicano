import { fail } from '@sveltejs/kit';
import { listCart, setCartQty, removeFromCart, checkout, db } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const items = listCart(locals.cartKey);
	return {
		items,
		total: items.reduce((sum, i) => sum + i.price * i.qty, 0)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	setQty: async ({ request, locals }) => {
		const form = await request.formData();
		setCartQty(locals.cartKey, Number(form.get('productId')), Number(form.get('qty')));
		return { ok: true };
	},

	remove: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('productId'));
		const product = /** @type {{ title: string } | undefined} */ (
			db.prepare('SELECT title FROM products WHERE id = ?').get(id)
		);
		removeFromCart(locals.cartKey, id);
		return { removed: product?.title ?? 'Item' };
	},

	checkout: async ({ locals }) => {
		// Signing in is the last gate — it makes the simulated session do real work.
		if (!locals.user) return fail(401, { needsAuth: true });

		const order = checkout(locals.cartKey, locals.user.id);
		if (!order) return fail(400, { message: 'Your cart is empty.' });

		return { order };
	}
};
