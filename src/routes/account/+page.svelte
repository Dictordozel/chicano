<script>
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';

	/** @type {{ data: { user: any, upcoming: any[], past: any[], orders: any[] } }} */
	let { data } = $props();

	/** @param {string} iso */
	function fmt(iso) {
		const [y, m, d] = iso.split('-').map(Number);
		return new Intl.DateTimeFormat('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'long'
		}).format(new Date(y, m - 1, d));
	}

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onCancel = () => async ({ result, update }) => {
		if (result.type === 'success') {
			pushToast('Booking cancelled', { body: 'The slot is back in the book.', kind: 'info' });
		} else if (result.type === 'failure') {
			pushToast('Could not cancel', { kind: 'error' });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>My chair — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
	<div class="text-center">
		<p class="display text-[0.8rem] text-gold">{data.user.email}</p>
		<h1 class="gothic mt-3 text-4xl text-zinc-100 sm:text-5xl">{data.user.name}</h1>
		<Ornament icon="crown" class="mx-auto mt-6 max-w-xs" />
	</div>

	<!-- --------------------------------------------------- upcoming -->
	<h2 class="display mt-14 border-b border-zinc-800 pb-4 text-[0.85rem] text-zinc-100">
		Upcoming appointments
	</h2>

	{#if data.upcoming.length === 0}
		<div class="mt-6 border border-dashed border-zinc-800 p-10 text-center">
			<span class="inline-flex text-zinc-700"><Icon name="calendar" size="32" /></span>
			<p class="mt-4 text-sm text-zinc-500">No chair booked. The mirror is waiting.</p>
			<a href="/booking" class="btn btn-gold mt-6">Book a chair</a>
		</div>
	{:else}
		<ul class="mt-2 divide-y divide-zinc-900">
			{#each data.upcoming as a (a.id)}
				<li class="flex flex-wrap items-center gap-4 py-5">
					<div
						class="flex w-16 shrink-0 flex-col items-center border border-gold/40 bg-gold/5 py-2"
					>
						<span class="display text-[0.7rem] text-zinc-500">{fmt(a.date).split(' ')[0]}</span>
						<span class="gothic text-2xl text-gold tabular-nums">{a.date.slice(8)}</span>
						<span class="display text-[0.7rem] text-gold tabular-nums">{a.time}</span>
					</div>

					<div class="min-w-0 flex-1">
						<p class="display text-[0.85rem] text-zinc-100">{a.service}</p>
						<p class="mt-1.5 text-[0.95rem] text-zinc-500">
							{a.barber_alias} — {a.barber_name} · {a.duration_min} min
						</p>
						{#if a.note}
							<p class="mt-1.5 text-[0.9rem] text-zinc-600 italic">“{a.note}”</p>
						{/if}
					</div>

					<div class="flex items-center gap-4">
						<span class="gothic text-xl text-gold tabular-nums">{a.price} ₽</span>
						<form method="POST" action="?/cancel" use:enhance={onCancel}>
							<input type="hidden" name="id" value={a.id} />
							<button
								type="submit"
								class="display text-[0.75rem] text-zinc-600 transition-colors hover:text-flash"
							>
								Cancel
							</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- ------------------------------------------------------ history -->
	{#if data.past.length > 0}
		<h2 class="display mt-16 border-b border-zinc-800 pb-4 text-[0.85rem] text-zinc-100">
			History
		</h2>
		<ul class="mt-2 divide-y divide-zinc-900">
			{#each data.past as a (a.id)}
				<li class="flex items-center gap-4 py-4 text-sm">
					<span class="w-28 shrink-0 text-[0.9rem] text-zinc-600 tabular-nums">
						{fmt(a.date)} · {a.time}
					</span>
					<span class="min-w-0 flex-1 truncate text-zinc-500">
						{a.service} <span class="text-zinc-700">· {a.barber_alias}</span>
					</span>
					<span
						class="display shrink-0 text-[0.7rem] {a.status === 'cancelled'
							? 'text-flash'
							: 'text-zinc-600'}"
					>
						{a.status}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- ------------------------------------------------------- orders -->
	{#if data.orders.length > 0}
		<h2 class="display mt-16 border-b border-zinc-800 pb-4 text-[0.85rem] text-zinc-100">
			Shop orders
		</h2>
		<ul class="mt-2 divide-y divide-zinc-900">
			{#each data.orders as order (order.id)}
				<li class="py-5">
					<div class="flex items-baseline justify-between gap-4">
						<span class="display text-[0.8rem] text-zinc-300">Order #{order.id}</span>
						<span class="gothic text-xl text-gold tabular-nums">{order.total} ₽</span>
					</div>
					<ul class="mt-2 space-y-1">
						{#each order.items as item (item.id)}
							<li class="flex justify-between gap-4 text-[0.9rem] text-zinc-500">
								<span class="min-w-0 truncate">{item.title}</span>
								<span class="shrink-0 text-zinc-600 tabular-nums">×{item.qty}</span>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="mt-16 flex flex-col gap-2 sm:flex-row">
		<a href="/booking" class="btn btn-gold flex-1">Book another chair</a>
		<form method="POST" action="/logout" use:enhance class="flex-1">
			<button type="submit" class="btn btn-ghost w-full">
				<Icon name="logout" size="14" />
				Sign out
			</button>
		</form>
	</div>
</section>
