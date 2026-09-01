<script>
	import { enhance, applyAction } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import BookingForm from '$lib/components/BookingForm.svelte';

	/**
	 * @type {{
	 *   data: {
	 *     appointments: any[], services: any[], barbers: any[], slots: string[],
	 *     availability: Record<number, Record<string, string[]>>,
	 *     windowStart: string, windowEnd: string, editing: any, recentClients: any[]
	 *   },
	 *   form: any
	 * }}
	 */
	let { data, form } = $props();

	let saving = $state(false);
	let barberFilter = $state('all');

	let editing = $derived(data.editing);
	// A failed submit wins over the loaded row, so nothing typed is lost.
	let v = $derived(form?.values ?? data.editing ?? {});
	let e = $derived(form?.errors ?? {});

	/* ------------------------------------------------------------ list */

	let visible = $derived(
		barberFilter === 'all'
			? data.appointments
			: data.appointments.filter((a) => a.barber_alias === barberFilter)
	);

	/** Group by date so the list reads like a day book. */
	let grouped = $derived(
		visible.reduce((acc, a) => {
			(acc[a.date] ??= []).push(a);
			return acc;
		}, /** @type {Record<string, any[]>} */ ({}))
	);

	/** @param {string} iso */
	function fmt(iso) {
		const [y, m, d] = iso.split('-').map(Number);
		return new Intl.DateTimeFormat('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(new Date(y, m - 1, d));
	}

	/* --------------------------------------------------------- actions */

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onSubmit = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;

			if (result.type === 'redirect') {
				pushToast('Booking updated', { body: 'The day book is up to date.' });
				await applyAction(result);
				return;
			}

			if (result.type === 'success' && result.data?.created) {
				const c = result.data.created;
				pushToast('Booking created', {
					body: `#${c.id} for ${c.client} — ${fmt(c.date)} at ${c.time}.`,
					duration: 7000
				});
			} else if (result.type === 'failure') {
				const first = Object.values(result.data?.errors ?? {})[0];
				pushToast('Booking not saved', {
					body: /** @type {string} */ (first) ?? result.data?.message ?? 'Check the form.',
					kind: 'error'
				});
			}

			await update({ reset: false });
		};
	};

	/**
	 * @param {string} okTitle
	 * @returns {import('@sveltejs/kit').SubmitFunction}
	 */
	const rowAction = (okTitle) => () => async ({ result, update }) => {
		if (result.type === 'success') {
			pushToast(okTitle, { kind: 'info' });
		} else if (result.type === 'failure') {
			pushToast('Action failed', { body: result.data?.message, kind: 'error' });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>{editing ? 'Edit booking' : 'Bookings'} — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Bookings</h1>
	<p class="mt-2 text-sm text-zinc-500">
		Everything from today onwards. Creating a booking here also creates the client record.
	</p>

	<div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
		<!-- ------------------------------------------------------ list -->
		<div>
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
				<h2 class="display text-[0.62rem] text-zinc-100">
					In the book — {visible.length}
				</h2>

				<div class="flex flex-wrap gap-1">
					{#each [{ key: 'all', label: 'All' }, ...data.barbers.map((b) => ({ key: b.alias, label: b.alias }))] as chip (chip.key)}
						<button
							type="button"
							onclick={() => (barberFilter = chip.key)}
							aria-pressed={barberFilter === chip.key}
							class="display border px-2.5 py-1.5 text-[0.5rem] transition-colors {barberFilter ===
							chip.key
								? 'border-gold bg-gold text-black'
								: 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200'}"
						>
							{chip.label}
						</button>
					{/each}
				</div>
			</div>

			{#if visible.length === 0}
				<p class="mt-6 border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
					Nothing in the book yet.
				</p>
			{:else}
				{#each Object.entries(grouped) as [day, rows] (day)}
					<h3 class="display mt-8 mb-1 text-[0.55rem] text-gold">{fmt(day)}</h3>
					<ul class="divide-y divide-zinc-900">
						{#each rows as a (a.id)}
							<li
								class="-ml-3 flex flex-wrap items-start gap-x-4 gap-y-2 border-l-2 py-4 pl-3 transition-colors {editing?.id ===
								a.id
									? 'border-gold bg-gold/5'
									: 'border-transparent'} {a.status === 'cancelled' ? 'opacity-45' : ''}"
							>
								<span class="display w-11 shrink-0 pt-0.5 text-[0.62rem] text-gold tabular-nums">
									{a.time}
								</span>

								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-[0.88rem] text-zinc-100">{a.service}</span>
										{#if a.status === 'cancelled'}
											<span class="display border border-flash px-1.5 py-0.5 text-[0.45rem] text-flash">
												cancelled
											</span>
										{/if}
									</div>
									<p class="mt-1 text-[0.75rem] text-zinc-500">
										{a.barber_alias} · {a.duration_min} min · {a.price} ₽
									</p>
									<p class="mt-1 text-[0.75rem] text-zinc-400">
										{a.client_name}
										<span class="text-zinc-600">· {a.client_email}</span>
										{#if a.client_phone}<span class="text-zinc-600"> · {a.client_phone}</span>{/if}
									</p>
									{#if a.note}
										<p class="mt-1 text-[0.72rem] text-zinc-600 italic">“{a.note}”</p>
									{/if}
								</div>

								<div class="flex shrink-0 items-center gap-3">
									<a
										href="?edit={a.id}#editor"
										class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-gold"
										aria-label="Edit booking {a.id}"
									>
										Edit
									</a>

									{#if a.status === 'cancelled'}
										<form method="POST" action="?/restore" use:enhance={rowAction('Booking restored')}>
											<input type="hidden" name="id" value={a.id} />
											<button
												type="submit"
												class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-gold"
											>
												Restore
											</button>
										</form>
									{:else}
										<form method="POST" action="?/cancel" use:enhance={rowAction('Booking cancelled')}>
											<input type="hidden" name="id" value={a.id} />
											<button
												type="submit"
												class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-flash"
											>
												Cancel
											</button>
										</form>
									{/if}

									<form method="POST" action="?/remove" use:enhance={rowAction('Booking deleted')}>
										<input type="hidden" name="id" value={a.id} />
										<button
											type="submit"
											class="p-1 text-zinc-700 transition-colors hover:text-flash"
											aria-label="Delete booking {a.id}"
										>
											<Icon name="trash" size="13" />
										</button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/each}
			{/if}
		</div>

		<!-- ------------------------------------------------------ form -->
		<div class="lg:sticky lg:top-24 lg:self-start">
			<!-- Remount on a different target so the barber/date picker resets with it -->
			{#key editing?.id ?? 'new'}
				<BookingForm
					services={data.services}
					barbers={data.barbers}
					slots={data.slots}
					availability={data.availability}
					windowStart={data.windowStart}
					windowEnd={data.windowEnd}
					{editing}
					values={v}
					errors={e}
					{saving}
					submit={onSubmit}
				/>
			{/key}

			{#if data.recentClients.length > 0 && !editing}
				<div class="card mt-4 p-5">
					<p class="display text-[0.55rem] text-zinc-500">Recent clients</p>
					<ul class="mt-3 space-y-1.5">
						{#each data.recentClients.slice(0, 6) as c (c.email)}
							<li class="truncate text-[0.75rem] text-zinc-500">
								<span class="text-zinc-300">{c.name}</span> · {c.email}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
</section>
