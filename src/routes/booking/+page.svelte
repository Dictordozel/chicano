<script>
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';

	/**
	 * @type {{
	 *   data: { services: any[], barbers: any[], availability: Record<number, Record<string, string[]>>, dates: string[], slots: string[], preselect: string | null, user: any },
	 *   form: any
	 * }}
	 */
	let { data, form } = $props();

	/* ---------------------------------------------------------------- state */

	// Defaults are captured once on purpose: reloading `data` after a booking
	// must refresh availability without throwing away the visitor's choices.
	const initial = untrack(() => {
		const preselected = data.services.find((s) => s.slug === data.preselect);
		const firstBarber = data.barbers[0]?.id;
		return {
			serviceId: preselected?.id ?? data.services[0]?.id,
			barberId: firstBarber,
			date: firstOpenDate(firstBarber)
		};
	});

	let serviceId = $state(initial.serviceId);
	let barberId = $state(initial.barberId);
	let date = $state(initial.date);
	let time = $state('');
	let note = $state('');
	let guest = $state({ name: '', email: '', phone: '' });
	let submitting = $state(false);

	// The action result is the single source of truth for the confirmation, so
	// it renders during SSR too — the page still confirms a booking without JS.
	// `dismissed` remembers which one the user waved away via "Book another".
	let dismissed = $state(0);
	let booked = $derived(
		form?.success && form.appointment?.id !== dismissed ? form.appointment : null
	);

	/* ------------------------------------------------------------ derived */

	let service = $derived(data.services.find((s) => s.id === serviceId));
	let barber = $derived(data.barbers.find((b) => b.id === barberId));
	let freeToday = $derived(data.availability[barberId]?.[date] ?? []);

	let ready = $derived(
		Boolean(serviceId && barberId && date && time) &&
			(Boolean(data.user) || (guest.name.trim().length >= 2 && guest.email.includes('@')))
	);

	// A slot chosen for one barber rarely survives a switch to another — drop it
	// rather than letting the summary show something that is no longer bookable.
	$effect(() => {
		if (time && !freeToday.includes(time)) time = '';
	});

	/* ---------------------------------------------------------------- utils */

	/** @param {string} iso */
	function asDate(iso) {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	/** @param {string} iso @param {Intl.DateTimeFormatOptions} opts */
	const fmt = (iso, opts) => new Intl.DateTimeFormat('en-GB', opts).format(asDate(iso));

	/** @param {number} id barber id */
	function firstOpenDate(id) {
		const map = data.availability[id] ?? {};
		return data.dates.find((d) => (map[d] ?? []).length > 0) ?? data.dates[0];
	}

	/** @param {number} id */
	function pickBarber(id) {
		barberId = id;
		if ((data.availability[id]?.[date] ?? []).length === 0) date = firstOpenDate(id);
	}

	/** @param {string} iso */
	function freeCount(iso) {
		return (data.availability[barberId]?.[iso] ?? []).length;
	}

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const submit = () => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;

			if (result.type === 'success' && result.data?.success) {
				const a = result.data.appointment;
				pushToast('Chair reserved', {
					body: `${a.service} with ${a.barber_alias} — ${fmt(a.date, {
						weekday: 'short',
						day: 'numeric',
						month: 'long'
					})} at ${a.time}.`,
					duration: 8000
				});
				time = '';
				note = '';
			} else if (result.type === 'failure') {
				const first = Object.values(result.data?.errors ?? {})[0];
				pushToast('Booking not confirmed', {
					body: /** @type {string} */ (first) ?? 'Check the form and try again.',
					kind: 'error'
				});
			}

			// Refresh availability so the freed/taken slots are correct straight away.
			await update({ reset: false });
		};
	};
</script>

<svelte:head>
	<title>Book a chair — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
	<div class="text-center">
		<p class="display text-[0.8rem] text-gold">Reserve your time</p>
		<h1 class="gothic mt-3 text-4xl text-zinc-100 sm:text-6xl">Book a chair</h1>
		<Ornament icon="razor" class="mx-auto mt-6 max-w-xs" />
	</div>

	{#if booked}
		<!-- ------------------------------------------------ confirmation -->
		<div
			in:fly={{ y: 16, duration: 300 }}
			class="mx-auto mt-12 max-w-lg border border-gold/60 bg-gold/5 p-8 text-center"
		>
			<span class="inline-flex text-gold"><Icon name="check" size="34" stroke={1.6} /></span>
			<h2 class="gothic mt-4 text-3xl text-gold">You're in the book</h2>
			<p class="mt-2 text-sm text-zinc-400">Booking #{booked.id} is confirmed.</p>

			<dl class="mt-7 space-y-3 border-y border-gold/20 py-6 text-left text-sm">
				{#each [{ k: 'Service', v: booked.service }, { k: 'Barber', v: `${booked.barber_alias} — ${booked.barber_name}` }, { k: 'When', v: `${fmt(booked.date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${booked.time}` }, { k: 'Duration', v: `${booked.duration_min} min` }, { k: 'Price', v: `${booked.price} ₽` }] as row (row.k)}
					<div class="flex justify-between gap-4">
						<dt class="display text-[0.75rem] text-zinc-500">{row.k}</dt>
						<dd class="text-right text-zinc-200">{row.v}</dd>
					</div>
				{/each}
			</dl>

			<div class="mt-7 flex flex-col gap-2 sm:flex-row">
				<a href="/account" class="btn btn-gold flex-1">My chair</a>
				<button type="button" class="btn btn-ghost flex-1" onclick={() => (dismissed = booked.id)}>
					Book another
				</button>
			</div>
		</div>
	{:else}
		<form method="POST" action="?/book" use:enhance={submit} class="mt-12">
			<input type="hidden" name="serviceId" value={serviceId} />
			<input type="hidden" name="barberId" value={barberId} />
			<input type="hidden" name="date" value={date} />
			<input type="hidden" name="time" value={time} />

			<!-- ------------------------------------------------ 1. service -->
			<fieldset class="border-t border-zinc-800 pt-8">
				<legend class="sr-only">Service</legend>
				<p class="display flex items-center gap-3 text-[0.8rem] text-zinc-100">
					<span
						class="flex h-6 w-6 items-center justify-center border border-gold text-[0.8rem] text-gold"
						>1</span
					>
					Choose the work
				</p>

				<div class="mt-6 space-y-8">
					{#each [{ key: 'hair', label: 'Men’s haircuts', icon: 'comb' }, { key: 'beard', label: 'Beard & moustache', icon: 'razor' }] as group (group.key)}
						<div>
							<p class="mb-3 flex items-center gap-2 text-[0.85rem] text-zinc-500">
								<span class="text-gold/60"><Icon name={group.icon} size="14" /></span>
								{group.label}
							</p>
							<div class="grid gap-2 sm:grid-cols-2">
								{#each data.services.filter((s) => s.category === group.key) as s (s.id)}
									<button
										type="button"
										onclick={() => (serviceId = s.id)}
										aria-pressed={serviceId === s.id}
										class="border p-4 text-left transition-all duration-200 {serviceId === s.id
											? 'border-gold bg-gold/8'
											: 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'}"
									>
										<div class="flex items-baseline justify-between gap-3">
											<span
												class="display text-[0.85rem] {serviceId === s.id
													? 'text-gold'
													: 'text-zinc-200'}">{s.title}</span
											>
											<span class="gothic shrink-0 text-lg text-gold tabular-nums">{s.price} ₽</span>
										</div>
										<p class="mt-1.5 text-[0.9rem] text-zinc-500">
											{s.duration_min} min · {s.tagline}
										</p>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</fieldset>

			<!-- ------------------------------------------------- 2. barber -->
			<fieldset class="mt-12 border-t border-zinc-800 pt-8">
				<legend class="sr-only">Barber</legend>
				<p class="display flex items-center gap-3 text-[0.8rem] text-zinc-100">
					<span
						class="flex h-6 w-6 items-center justify-center border border-gold text-[0.8rem] text-gold"
						>2</span
					>
					Pick your barber
				</p>

				<div class="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.barbers as b (b.id)}
						<button
							type="button"
							onclick={() => pickBarber(b.id)}
							aria-pressed={barberId === b.id}
							class="border p-5 text-left transition-all duration-200 {barberId === b.id
								? 'border-gold bg-gold/8'
								: 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'}"
						>
							<span class="gothic block text-2xl {barberId === b.id ? 'text-gold' : 'text-zinc-300'}">
								{b.alias}
							</span>
							<span class="display mt-1 block text-[0.75rem] text-zinc-500">{b.name}</span>
							<span class="mt-3 block text-[0.9rem] leading-snug text-zinc-500">{b.specialty}</span>
						</button>
					{/each}
				</div>
			</fieldset>

			<!-- --------------------------------------------------- 3. date -->
			<fieldset class="mt-12 border-t border-zinc-800 pt-8">
				<legend class="sr-only">Date</legend>
				<p class="display flex items-center gap-3 text-[0.8rem] text-zinc-100">
					<span
						class="flex h-6 w-6 items-center justify-center border border-gold text-[0.8rem] text-gold"
						>3</span
					>
					Choose a day
				</p>

				<!-- Horizontal rail: two weeks of days, thumb-scrollable on a phone -->
				<div class="mt-6 flex snap-x gap-2 overflow-x-auto pb-3">
					{#each data.dates as d, i (d)}
						{@const free = freeCount(d)}
						<!--
							A full day is dimmed, never faded out: the date and the word "full"
							have to stay readable, otherwise the chip reads as an empty hole
							rather than as a day you cannot have.
						-->
						<button
							type="button"
							onclick={() => (date = d)}
							disabled={free === 0}
							aria-pressed={date === d}
							class="flex w-16 shrink-0 snap-start flex-col items-center border py-3 transition-all duration-200 {date ===
							d
								? 'border-gold bg-gold/10'
								: free === 0
									? 'border-zinc-800 bg-black/40'
									: 'border-zinc-800 bg-zinc-900/30 enabled:hover:border-zinc-700'}"
						>
							<span class="display text-[0.75rem] text-zinc-500">
								{i === 0 ? 'Today' : fmt(d, { weekday: 'short' })}
							</span>
							<span
								class="gothic mt-1 text-2xl tabular-nums {date === d
									? 'text-gold'
									: free === 0
										? 'text-zinc-500'
										: 'text-zinc-200'}"
							>
								{fmt(d, { day: 'numeric' })}
							</span>
							<span class="mt-1 text-[0.75rem] {free === 0 ? 'text-flash' : 'text-zinc-500'}">
								{free ? `${free} free` : 'full'}
							</span>
						</button>
					{/each}
				</div>
				<p class="mt-1 text-[0.85rem] text-zinc-600">
					{fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
				</p>
			</fieldset>

			<!-- --------------------------------------------------- 4. time -->
			<fieldset class="mt-12 border-t border-zinc-800 pt-8">
				<legend class="sr-only">Time</legend>
				<p class="display flex items-center gap-3 text-[0.8rem] text-zinc-100">
					<span
						class="flex h-6 w-6 items-center justify-center border border-gold text-[0.8rem] text-gold"
						>4</span
					>
					Free time with {barber?.alias}
				</p>

				{#if freeToday.length === 0}
					<p class="mt-6 border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
						No chairs left on this day. Try another date or another barber.
					</p>
				{:else}
					<div class="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
						{#each data.slots as t (t)}
							{@const open = freeToday.includes(t)}
							<button
								type="button"
								onclick={() => (time = t)}
								disabled={!open}
								aria-pressed={time === t}
								class="border py-3 text-center transition-all duration-200 {time === t
									? 'border-gold bg-gold text-black'
									: open
										? 'border-zinc-800 bg-zinc-900/30 text-zinc-200 hover:border-gold/60'
										: 'border-zinc-800 bg-black/40 text-zinc-500 line-through'}"
							>
								<span class="display text-[0.85rem] tabular-nums">{t}</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if form?.errors?.time}
					<p class="mt-3 text-xs text-flash">{form.errors.time}</p>
				{/if}
			</fieldset>

			<!-- ------------------------------------------------ 5. details -->
			<fieldset class="mt-12 border-t border-zinc-800 pt-8">
				<legend class="sr-only">Your details</legend>
				<p class="display flex items-center gap-3 text-[0.8rem] text-zinc-100">
					<span
						class="flex h-6 w-6 items-center justify-center border border-gold text-[0.8rem] text-gold"
						>5</span
					>
					Your details
				</p>

				{#if data.user}
					<p class="mt-6 flex items-center gap-3 border border-zinc-800 bg-zinc-900/30 p-4 text-sm">
						<span class="text-gold"><Icon name="user" size="16" /></span>
						<span class="text-zinc-300">
							Booking as <span class="text-gold">{data.user.name}</span>
							<span class="text-zinc-600">· {data.user.email}</span>
						</span>
					</p>
				{:else}
					<div class="mt-6 grid gap-4 sm:grid-cols-2">
						<div>
							<label class="label" for="b-name">Name</label>
							<input
								id="b-name"
								name="name"
								class="field"
								placeholder="Ramon Vega"
								autocomplete="name"
								bind:value={guest.name}
							/>
							{#if form?.errors?.name}<p class="mt-1.5 text-xs text-flash">{form.errors.name}</p>{/if}
						</div>
						<div>
							<label class="label" for="b-email">Email</label>
							<input
								id="b-email"
								name="email"
								type="email"
								class="field"
								placeholder="you@example.com"
								autocomplete="email"
								bind:value={guest.email}
							/>
							{#if form?.errors?.email}<p class="mt-1.5 text-xs text-flash">
									{form.errors.email}
								</p>{/if}
						</div>
						<div class="sm:col-span-2">
							<label class="label" for="b-phone">Phone <span class="text-zinc-700">— optional</span></label>
							<input
								id="b-phone"
								name="phone"
								type="tel"
								class="field"
								placeholder="+7 900 000-00-00"
								autocomplete="tel"
								bind:value={guest.phone}
							/>
						</div>
					</div>
					<p class="mt-3 text-[0.9rem] text-zinc-600">
						Booking without an account creates one for you — no password needed.
					</p>
				{/if}

				<div class="mt-5">
					<label class="label" for="b-note">Note for the barber <span class="text-zinc-700">— optional</span></label>
					<textarea
						id="b-note"
						name="note"
						rows="3"
						class="field resize-none"
						placeholder="Keep the length on top, tight on the sides."
						bind:value={note}
					></textarea>
				</div>
			</fieldset>

			<!-- ------------------------------------------------- summary -->
			<div
				class="sticky bottom-0 z-30 -mx-4 mt-12 border-t border-zinc-800 bg-ink/95 px-4 py-4 backdrop-blur sm:mx-0 sm:border sm:px-6"
			>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div class="min-w-0">
						<p class="display text-[0.75rem] text-zinc-500">Your booking</p>
						<p class="mt-1 truncate text-sm text-zinc-200">
							{service?.title ?? '—'}
							<span class="text-zinc-600">·</span>
							{barber?.alias ?? '—'}
							<span class="text-zinc-600">·</span>
							{#if time}
								<span class="text-gold"
									>{fmt(date, { day: 'numeric', month: 'short' })}, {time}</span
								>
							{:else}
								<span class="text-zinc-600">pick a time</span>
							{/if}
						</p>
					</div>

					<div class="flex items-center gap-4">
						<span class="gothic text-2xl text-gold tabular-nums">{service?.price ?? 0} ₽</span>
						<button type="submit" class="btn btn-gold" disabled={!ready || submitting}>
							{#if submitting}
								Booking…
							{:else}
								Confirm
								<Icon name="check" size="15" stroke={2} />
							{/if}
						</button>
					</div>
				</div>
			</div>
		</form>
	{/if}
</section>
