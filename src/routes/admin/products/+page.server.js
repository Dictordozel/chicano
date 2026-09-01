import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guard.js';
import {
	createProduct,
	updateProduct,
	deleteProduct,
	getProduct
} from '$lib/server/admin.js';
import { listProducts, db } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const products = /** @type {any[]} */ (listProducts());
	const editId = Number(url.searchParams.get('edit')) || 0;

	return {
		products,
		categories: [...new Set(products.map((p) => p.category))],
		editing: editId ? getProduct(editId) : null
	};
}

/** Shared by create and update. @param {FormData} form */
function readProduct(form) {
	const values = {
		title: String(form.get('title') ?? '').trim(),
		brand: String(form.get('brand') ?? '').trim(),
		category: String(form.get('category') ?? '').trim(),
		price: Number(form.get('price')),
		volume: String(form.get('volume') ?? '').trim(),
		description: String(form.get('description') ?? '').trim(),
		url: String(form.get('url') ?? '').trim(),
		badge: String(form.get('badge') ?? '').trim(),
		slug: String(form.get('slug') ?? '').trim()
	};

	/** @type {Record<string, string>} */
	const errors = {};
	if (values.title.length < 3) errors.title = 'Enter the product name.';
	if (values.brand.length < 2) errors.brand = 'Enter the brand.';
	if (values.category.length < 2) errors.category = 'Enter a category.';
	if (!Number.isFinite(values.price) || values.price < 0) errors.price = 'Price must be 0 or more.';
	if (values.description.length < 10) errors.description = 'Describe the product in a sentence.';
	if (values.url && !/^https?:\/\//i.test(values.url)) {
		errors.url = 'The link must start with http:// or https://';
	}

	return {
		values,
		errors,
		record: {
			...values,
			url: values.url || 'https://ozon.ru',
			volume: values.volume || null,
			badge: values.badge || null
		}
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const { values, errors, record } = readProduct(await request.formData());

		if (Object.keys(errors).length) return fail(400, { errors, values });

		createProduct(record);
		return { created: values.title };
	},

	update: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!getProduct(id)) return fail(404, { message: 'That product no longer exists.' });

		const { values, errors, record } = readProduct(form);
		if (Object.keys(errors).length) return fail(400, { errors, values, editingId: id });

		updateProduct(id, record);
		redirect(303, '/admin/products');
	},

	remove: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		const title = /** @type {{ title: string } | undefined} */ (
			db.prepare('SELECT title FROM products WHERE id = ?').get(id)
		)?.title;

		deleteProduct(id);
		return { removed: title ?? 'Product' };
	}
};
