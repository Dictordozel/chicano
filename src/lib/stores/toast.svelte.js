/**
 * Global toast queue built on Svelte 5 runes — no stores, no subscriptions.
 * Import `toasts` for the rendering side, call `pushToast()` from anywhere.
 */

/** @typedef {{ id: number, title: string, body?: string, kind: 'success' | 'error' | 'info' }} Toast */

/** @type {{ items: Toast[] }} */
export const toasts = $state({ items: [] });

let nextId = 1;

/**
 * @param {string} title
 * @param {{ body?: string, kind?: Toast['kind'], duration?: number }} [options]
 */
export function pushToast(title, options = {}) {
	const { body, kind = 'success', duration = 5000 } = options;
	const id = nextId++;

	toasts.items = [...toasts.items, { id, title, body, kind }];
	if (duration > 0) setTimeout(() => dismissToast(id), duration);

	return id;
}

/** @param {number} id */
export function dismissToast(id) {
	toasts.items = toasts.items.filter((t) => t.id !== id);
}
