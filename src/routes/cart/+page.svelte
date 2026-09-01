<script>
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';
	import ProductArt from '$lib/components/ProductArt.svelte';

	/** @type {{ data: { items: any[], total: number, user: any }, form: any }} */
	let { data, form } = $props();

	// Mirrors the action result so the confirmation also shows without JS.
	let placed = $derived(form?.order ?? null);

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onQty = () => async ({ result, update }) => {
		if (result.type === 'failure') pushToast('Could not update the cart', { kind: 'error' });
		await update({ reset: false });
	};

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onRemove = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.removed) {
			pushToast('Removed from cart', { body: result.data.removed, kind: 'info' });
		}
		await update({ reset: false });
	};

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onCheckout = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.order) {
			const o = result.data.order;
			pushToast('Order placed', {
				body: `#${o.id} — ${o.count} item${o.count > 1 ? 's' : ''} for ${o.total} ₽. Simulated payment accepted.`,
				duration: 8000
			});
		} else if (result.type === 'failure' && result.data?.needsAuth) {
			pushToast('Sign in to finish', {
				body: 'The order needs an account — it takes ten seconds.',
				kind: 'error'
			});
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>Cart — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
	<div class="text-center">
		<p class="display text-[0.8rem] text-gold">Simulated order</p>
		<h1 class="gothic mt-3 text-4xl text-zinc-100 sm:text-5xl">Your cart</h1>
		<Ornament icon="bag" class="mx-auto mt-6 max-w-xs" />
	</div>

	{#if placed}
		<!-- ------------------------------------------------ order placed -->
		<div
			in:fly={{ y: 16, duration: 300 }}
			class="mt-12 border border-gold/60 bg-gold/5 p-8 text-center"
		>
			<span class="inline-flex text-gold"><Icon name="check" size="34" stroke={1.6} /></span>
			<h2 class="gothic mt-4 text-3xl text-gold">Order #{placed.id}</h2>
			<p class="mt-3 text-sm leading-relaxed text-zinc-400">
				{placed.count} item{placed.count > 1 ? 's' : ''} for
				<span class="text-gold tabular-nums">{placed.total} ₽</span>. Collect it at the counter on
				your next visit.
			</p>
			<div class="mt-7 flex flex-col gap-2 sm:flex-row">
				<a href="/shop" class="btn btn-ghost flex-1">Back to the counter</a>
				<a href="/account" class="btn btn-gold flex-1">My chair</a>
			</div>
		</div>
	{:else if data.items.length === 0}
		<!-- ------------------------------------------------------- empty -->
		<div class="mt-14 border border-dashed border-zinc-800 p-12 text-center">
			<span class="inline-flex text-zinc-700"><Icon name="cart" size="38" /></span>
			<p class="mt-5 text-sm text-zinc-500">Nothing here yet. The counter is one tap away.</p>
			<a href="/shop" class="btn btn-gold mt-7">
				<Icon name="bag" size="14" />
				Browse goods
			</a>
		</div>
	{:else}
		<ul class="mt-12 divide-y divide-zinc-900 border-y border-zinc-800">
			{#each data.items as item (item.id)}
				<li class="flex gap-4 py-5">
					<div class="hidden w-24 shrink-0 sm:block">
						<ProductArt slug={item.slug} category={item.category} class="!aspect-square !border-0" />
					</div>

					<div class="min-w-0 flex-1">
						<p class="display text-[0.75rem] text-zinc-600">{item.brand}</p>
						<h2 class="mt-1.5 text-[1rem] leading-snug font-medium text-zinc-100">
							{item.title}
						</h2>
						<p class="mt-1 text-[0.9rem] text-zinc-600">
							{item.price} ₽{item.volume ? ` · ${item.volume}` : ''}
						</p>

						<div class="mt-3 flex flex-wrap items-center gap-3">
							<!-- quantity stepper -->
							<div class="flex items-center border border-zinc-800">
								<form method="POST" action="?/setQty" use:enhance={onQty}>
									<input type="hidden" name="productId" value={item.id} />
									<input type="hidden" name="qty" value={item.qty - 1} />
									<button
										type="submit"
										class="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-gold"
										aria-label="Decrease quantity"
									>
										<Icon name="minus" size="13" stroke={2} />
									</button>
								</form>

								<span class="w-8 text-center text-sm text-zinc-100 tabular-nums">{item.qty}</span>

								<form method="POST" action="?/setQty" use:enhance={onQty}>
									<input type="hidden" name="productId" value={item.id} />
									<input type="hidden" name="qty" value={item.qty + 1} />
									<button
										type="submit"
										class="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-gold"
										aria-label="Increase quantity"
									>
										<Icon name="plus" size="13" stroke={2} />
									</button>
								</form>
							</div>

							<form method="POST" action="?/remove" use:enhance={onRemove}>
								<input type="hidden" name="productId" value={item.id} />
								<button
									type="submit"
									class="display flex items-center gap-1.5 text-[0.75rem] text-zinc-600 transition-colors hover:text-flash"
								>
									<Icon name="trash" size="12" />
									Remove
								</button>
							</form>

							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="display flex items-center gap-1.5 text-[0.75rem] text-zinc-600 transition-colors hover:text-gold"
							>
								Ozon
								<Icon name="external" size="11" />
							</a>
						</div>
					</div>

					<div class="shrink-0 text-right">
						<span class="gothic text-xl text-gold tabular-nums">{item.price * item.qty} ₽</span>
					</div>
				</li>
			{/each}
		</ul>

		<!-- ------------------------------------------------------ totals -->
		<div class="mt-8 flex items-end justify-between gap-6">
			<div>
				<p class="display text-[0.75rem] text-zinc-500">Total</p>
				<p class="gothic mt-1 text-4xl text-gold tabular-nums">{data.total} ₽</p>
			</div>

			<form method="POST" action="?/checkout" use:enhance={onCheckout}>
				<button type="submit" class="btn btn-gold">
					<Icon name="check" size="15" stroke={2} />
					Place order
				</button>
			</form>
		</div>

		{#if !data.user}
			<p
				class="mt-6 flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/30 px-4 py-3.5 text-[0.95rem] text-zinc-400"
			>
				<span>You need an account to finish the order.</span>
				<a href="/login?next=/cart" class="display text-[0.75rem] text-gold hover:underline">
					Sign in →
				</a>
			</p>
		{/if}

		<p class="mt-6 text-center text-[0.9rem] text-zinc-600">
			Prototype notice — no payment is taken. The order is written to SQLite and the cart is emptied.
		</p>
	{/if}
</section>
