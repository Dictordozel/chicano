import { fail } from '@sveltejs/kit';
import { listProducts, addToCart, listCart, db } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const products = /** @type {any[]} */ (listProducts());

	/** @type {Record<number, number>} product id -> quantity already in the cart */
	const inCart = {};
	for (const item of listCart(locals.cartKey)) inCart[item.id] = item.qty;

	return {
		products,
		inCart,
		categories: [...new Set(products.map((p) => p.category))]
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	add: async ({ request, locals }) => {
		const form = await request.formData();
		const productId = Number(form.get('productId'));
		const qty = Math.max(1, Math.min(99, Number(form.get('qty') ?? 1)));

		const product = /** @type {{ title: string } | undefined} */ (
			db.prepare('SELECT title FROM products WHERE id = ?').get(productId)
		);
		if (!product) return fail(400, { message: 'Unknown product.' });

		addToCart(locals.cartKey, productId, qty);
		return { added: product.title, qty };
	}
};
