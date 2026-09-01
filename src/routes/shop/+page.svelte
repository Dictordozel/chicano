<script>
	import { enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';
	import ProductArt from '$lib/components/ProductArt.svelte';

	/** @type {{ data: { products: any[], inCart: Record<number, number>, categories: string[] }, form: any }} */
	let { data } = $props();

	let filter = $state('all');
	let open = $state(/** @type {any} */ (null));

	let shown = $derived(
		filter === 'all' ? data.products : data.products.filter((p) => p.category === filter)
	);

	/** @param {string} title @param {number} qty */
	function announce(title, qty) {
		pushToast('Added to cart', {
			body: qty > 1 ? `${title} — ${qty} pcs.` : title
		});
	}

	/** Shared submit handler for every "add to cart" form on the page. */
	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const addToCart = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.added) {
			announce(result.data.added, result.data.qty ?? 1);
		} else if (result.type === 'failure') {
			pushToast('Could not add the item', { kind: 'error' });
		}
		await update({ reset: false });
	};

	/** @param {KeyboardEvent} e */
	function onKeydown(e) {
		if (e.key === 'Escape' && open) open = null;
	}
</script>

<svelte:head>
	<title>Shop — Chicano Barbershop</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
	<div class="text-center">
		<p class="display text-[0.6rem] text-gold">Take the shop home</p>
		<h1 class="gothic mt-3 text-4xl text-zinc-100 sm:text-6xl">The counter</h1>
		<p class="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
			Pomades, clays, oils and balms — the same tins we reach for behind the chair.
		</p>
		<Ornament icon="rose" class="mx-auto mt-6 max-w-xs" />
	</div>

	<!-- ------------------------------------------------------- filters -->
	<div class="mt-10 -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:justify-center sm:px-0">
		{#each [{ key: 'all', label: 'Everything' }, ...data.categories.map((c) => ({ key: c, label: c }))] as chip (chip.key)}
			<button
				type="button"
				onclick={() => (filter = chip.key)}
				aria-pressed={filter === chip.key}
				class="display shrink-0 snap-start border px-4 py-2.5 text-[0.6rem] transition-colors {filter ===
				chip.key
					? 'border-gold bg-gold text-black'
					: 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}"
			>
				{chip.label}
			</button>
		{/each}
	</div>

	<!-- --------------------------------------------------------- grid -->
	<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each shown as product (product.id)}
			<article id="p{product.id}" class="card card-hover flex flex-col overflow-hidden">
				<!-- Tapping the artwork or the title opens the full card -->
				<button
					type="button"
					class="group block text-left"
					onclick={() => (open = product)}
					aria-haspopup="dialog"
				>
					<ProductArt slug={product.slug} category={product.category} />

					<div class="p-5">
						<div class="flex items-start justify-between gap-3">
							<span class="display text-[0.52rem] text-zinc-600">{product.brand}</span>
							{#if product.badge}
								<span class="display border border-gold/40 px-2 py-0.5 text-[0.5rem] text-gold">
									{product.badge}
								</span>
							{/if}
						</div>

						<h2
							class="mt-3 text-[0.95rem] leading-snug font-medium text-zinc-100 transition-colors group-hover:text-gold"
						>
							{product.title}
						</h2>

						<p class="mt-2 line-clamp-2 text-[0.8rem] leading-relaxed text-zinc-500">
							{product.description}
						</p>
					</div>
				</button>

				<div class="mt-auto flex items-center justify-between gap-3 px-5 pb-5">
					<div>
						<span class="gothic text-2xl text-gold tabular-nums">{product.price} ₽</span>
						{#if product.volume}
							<span class="ml-1.5 text-[0.7rem] text-zinc-600">/ {product.volume}</span>
						{/if}
					</div>

					{#if data.inCart[product.id]}
						<span class="display flex items-center gap-1.5 text-[0.55rem] text-gold">
							<Icon name="check" size="13" stroke={2} />
							{data.inCart[product.id]} in cart
						</span>
					{/if}
				</div>

				<div class="grid grid-cols-2 border-t border-zinc-800">
					<a
						href={product.url}
						target="_blank"
						rel="noopener noreferrer"
						class="display flex items-center justify-center gap-1.5 border-r border-zinc-800 py-3.5 text-[0.55rem] text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-gold"
					>
						Купить на Ozon
						<Icon name="external" size="12" />
					</a>

					<form method="POST" action="?/add" use:enhance={addToCart}>
						<input type="hidden" name="productId" value={product.id} />
						<button
							type="submit"
							class="display flex w-full items-center justify-center gap-1.5 py-3.5 text-[0.55rem] text-gold transition-colors hover:bg-gold hover:text-black"
						>
							<Icon name="plus" size="12" stroke={2} />
							В корзину
						</button>
					</form>
				</div>
			</article>
		{/each}
	</div>

	{#if shown.length === 0}
		<p class="mt-16 text-center text-sm text-zinc-500">Nothing on this shelf yet.</p>
	{/if}

	<p class="mt-12 text-center text-[0.72rem] leading-relaxed text-zinc-600">
		Prototype notice — “В корзину” simulates an order inside the app.
		“Купить на Ozon” opens the marketplace listing in a new tab.
	</p>
</section>

<!-- ====================================================== detail modal -->
{#if open}
	<div
		class="fixed inset-0 z-90 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
		transition:fade={{ duration: 180 }}
	>
		<!-- backdrop -->
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			onclick={() => (open = null)}
			aria-label="Close product details"
			tabindex="-1"
		></button>

		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="product-title"
			transition:fly={{ y: 24, duration: 240 }}
			class="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border border-zinc-800 bg-ink shadow-[0_-10px_60px_rgba(0,0,0,0.9)] sm:max-h-[86vh]"
		>
			<button
				type="button"
				class="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center border border-zinc-800 bg-ink/80 text-zinc-400 transition-colors hover:border-gold hover:text-gold"
				onclick={() => (open = null)}
				aria-label="Close"
			>
				<Icon name="close" size="16" stroke={2} />
			</button>

			<ProductArt slug={open.slug} category={open.category} />

			<div class="p-6 sm:p-8">
				<div class="flex items-center justify-between gap-3">
					<span class="display text-[0.55rem] text-zinc-500">{open.brand}</span>
					{#if open.badge}
						<span class="display border border-gold/40 px-2 py-0.5 text-[0.5rem] text-gold">
							{open.badge}
						</span>
					{/if}
				</div>

				<h2 id="product-title" class="mt-3 text-xl leading-snug font-medium text-zinc-100">
					{open.title}
				</h2>

				<p class="mt-4 text-sm leading-relaxed text-zinc-400">{open.description}</p>

				<dl class="mt-6 grid grid-cols-2 gap-4 border-y border-zinc-800 py-5 text-sm">
					<div>
						<dt class="display text-[0.55rem] text-zinc-500">Price</dt>
						<dd class="gothic mt-1 text-3xl text-gold tabular-nums">{open.price} ₽</dd>
					</div>
					<div>
						<dt class="display text-[0.55rem] text-zinc-500">Volume</dt>
						<dd class="mt-1 text-zinc-200">{open.volume ?? '—'}</dd>
					</div>
				</dl>

				<div class="mt-6 flex flex-col gap-2 sm:flex-row">
					<a
						href={open.url}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-ghost flex-1"
					>
						Купить на Ozon
						<Icon name="external" size="14" />
					</a>

					<form method="POST" action="?/add" use:enhance={addToCart} class="flex-1">
						<input type="hidden" name="productId" value={open.id} />
						<button type="submit" class="btn btn-gold w-full">
							<Icon name="cart" size="14" />
							В корзину
						</button>
					</form>
				</div>

				<a
					href="/cart"
					class="display mt-4 block text-center text-[0.55rem] text-zinc-500 transition-colors hover:text-gold"
				>
					Go to cart →
				</a>
			</div>
		</div>
	</div>
{/if}
