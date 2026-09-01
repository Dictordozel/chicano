<script>
	import { enhance, applyAction } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';

	/**
	 * @type {{
	 *   data: { clients: any[], query: string, editing: any, history: any[], adminCount: number, user: any },
	 *   form: any
	 * }}
	 */
	let { data, form } = $props();

	let saving = $state(false);

	let editing = $derived(data.editing);
	// A failed submit wins over the loaded row, so nothing typed is lost.
	let v = $derived(form?.values ?? data.editing ?? {});
	let e = $derived(form?.errors ?? {});

	/** @param {string | null} iso */
	function fmt(iso) {
		if (!iso) return '—';
		const [y, m, d] = iso.split('-').map(Number);
		return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
			.format(new Date(y, m - 1, d));
	}

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onCreate = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success' && result.data?.created) {
				pushToast('Client added', { body: `${result.data.created} is on the book.` });
				await update();
			} else {
				if (result.type === 'failure') {
					const first = Object.values(result.data?.errors ?? {})[0];
					pushToast('Not saved', {
						body: /** @type {string} */ (first) ?? 'Check the form.',
						kind: 'error'
					});
				}
				await update({ reset: false });
			}
		};
	};

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onUpdate = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'redirect') {
				pushToast('Client updated', { body: 'Their details are up to date.' });
				await applyAction(result);
				return;
			}
			if (result.type === 'failure') {
				const first = Object.values(result.data?.errors ?? {})[0];
				pushToast('Not saved', {
					body: /** @type {string} */ (first) ?? result.data?.message ?? 'Check the form.',
					kind: 'error'
				});
			}
			await update({ reset: false });
		};
	};

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onRights = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.rights) {
			const { name, granted } = result.data.rights;
			pushToast(granted ? 'Back-office rights granted' : 'Rights revoked', {
				body: granted
					? `${name} can now reach /admin without the passcode.`
					: `${name} no longer has back-office access.`,
				kind: granted ? 'success' : 'info'
			});
		} else if (result.type === 'failure') {
			pushToast('Rights unchanged', { body: result.data?.message, kind: 'error' });
		}
		await update({ reset: false });
	};

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onRemove = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.removed) {
			pushToast('Client removed', { body: result.data.removed, kind: 'info' });
		} else if (result.type === 'failure') {
			pushToast('Cannot delete', { body: result.data?.message, kind: 'error', duration: 7000 });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>{editing ? 'Edit client' : 'Clients'} — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Clients</h1>
	<p class="mt-2 text-sm text-zinc-500">
		Everyone who has signed in or been booked in. Email is the identity — sign-in matches on it,
		and “Grant” hands out back-office rights.
	</p>

	<div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
		<!-- ------------------------------------------------------ list -->
		<div>
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
				<h2 class="display text-[0.8rem] text-zinc-100">
					On the book — {data.clients.length}
				</h2>

				<!-- GET form: the search term lives in the URL and survives a reload -->
				<form method="GET" class="flex items-center gap-2">
					<input
						type="search"
						name="q"
						value={data.query}
						placeholder="Name, email or phone"
						aria-label="Search clients"
						class="field !w-52 !py-1.5 !text-[0.95rem]"
					/>
					<button
						type="submit"
						class="display border border-zinc-800 px-3 py-2 text-[0.7rem] text-zinc-400 transition-colors hover:border-gold hover:text-gold"
					>
						Find
					</button>
					{#if data.query}
						<a
							href="/admin/clients"
							class="display text-[0.7rem] text-zinc-600 transition-colors hover:text-zinc-300"
						>
							Clear
						</a>
					{/if}
				</form>
			</div>

			{#if data.clients.length === 0}
				<p class="mt-6 border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
					{data.query ? `Nobody matches “${data.query}”.` : 'No clients yet.'}
				</p>
			{:else}
				<ul class="divide-y divide-zinc-900">
					{#each data.clients as c (c.id)}
						<li
							class="-ml-3 flex flex-wrap items-start gap-x-4 gap-y-2 border-l-2 py-4 pl-3 transition-colors {editing?.id ===
							c.id
								? 'border-gold bg-gold/5'
								: 'border-transparent'}"
						>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="text-[1rem] text-zinc-100">{c.name}</span>
									{#if c.is_admin}
										<span class="display border border-gold/40 px-1.5 py-0.5 text-[0.7rem] text-gold">
											admin
										</span>
									{/if}
									{#if data.user?.id === c.id}
										<span class="display text-[0.7rem] text-zinc-600">you</span>
									{/if}
								</div>

								<p class="mt-1 text-[0.9rem] text-zinc-500">
									{c.email}{c.phone ? ` · ${c.phone}` : ''}
								</p>

								<p class="mt-1.5 flex flex-wrap gap-x-3 text-[0.85rem] text-zinc-600">
									<span>
										{c.bookings} booking{c.bookings === 1 ? '' : 's'}
										{#if c.bookings_all > c.bookings}
											<span class="text-zinc-700">(+{c.bookings_all - c.bookings} cancelled)</span>
										{/if}
									</span>
									{#if c.orders > 0}
										<span>{c.orders} order{c.orders === 1 ? '' : 's'} · {c.spent} ₽</span>
									{/if}
									<span>last: {fmt(c.last_booking)}</span>
								</p>
							</div>

							<div class="flex shrink-0 items-center gap-3">
								{#if data.user?.id === c.id}
									<span
										class="display cursor-not-allowed text-[0.7rem] text-zinc-700"
										title="You cannot change your own back-office rights"
									>
										{c.is_admin ? 'Admin' : '—'}
									</span>
								{:else}
									<form method="POST" action="?/setAdmin" use:enhance={onRights}>
										<input type="hidden" name="id" value={c.id} />
										<input type="hidden" name="grant" value={c.is_admin ? '0' : '1'} />
										<button
											type="submit"
											class="display text-[0.7rem] transition-colors {c.is_admin
												? 'text-gold hover:text-flash'
												: 'text-zinc-600 hover:text-gold'}"
											title={c.is_admin
												? `Revoke back-office rights from ${c.name}`
												: `Grant back-office rights to ${c.name}`}
										>
											{c.is_admin ? 'Revoke' : 'Grant'}
										</button>
									</form>
								{/if}

								<a
									href="?edit={c.id}{data.query ? `&q=${encodeURIComponent(data.query)}` : ''}#editor"
									class="display text-[0.7rem] text-zinc-500 transition-colors hover:text-gold"
									aria-label="Edit {c.name}"
								>
									Edit
								</a>

								<form method="POST" action="?/remove" use:enhance={onRemove}>
									<input type="hidden" name="id" value={c.id} />
									<button
										type="submit"
										class="p-1 text-zinc-700 transition-colors hover:text-flash"
										aria-label="Delete {c.name}"
										title={c.bookings_all > 0 || c.orders > 0
											? 'Has bookings or orders'
											: 'Delete'}
									>
										<Icon name="trash" size="14" />
									</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<!--
				Worth saying out loud: with simulated sign-in, granting rights to an
				address means anyone who types that address gets the back office.
			-->
			<p
				class="mt-8 flex gap-3 border border-dashed border-zinc-800 px-4 py-3.5 text-[0.9rem] leading-relaxed text-zinc-600"
			>
				<span class="mt-0.5 shrink-0 text-gold/50"><Icon name="crown" size="14" /></span>
				<span>
					<span class="text-zinc-400">
						{data.adminCount} account{data.adminCount === 1 ? '' : 's'} hold back-office rights.
					</span>
					Sign-in is simulated in this prototype, so anyone who types a granted email gets in —
					treat “Grant” as you would a real password. The
					<code class="text-zinc-500">/admin/unlock</code> passcode always remains as a way back in.
				</span>
			</p>
		</div>

		<!-- ------------------------------------------------------ form -->
		<div class="lg:sticky lg:top-24 lg:self-start">
			<div id="editor" class="card p-6 {editing ? 'border-gold/50' : ''}">
				<div class="flex items-center justify-between gap-3">
					<h2 class="display flex items-center gap-2 text-[0.8rem] text-gold">
						<Icon name={editing ? 'user' : 'plus'} size="14" stroke={2} />
						{editing ? 'Edit client' : 'New client'}
					</h2>
					{#if editing}
						<a
							href="/admin/clients"
							class="display text-[0.7rem] text-zinc-500 transition-colors hover:text-zinc-200"
						>
							Cancel
						</a>
					{/if}
				</div>

				{#if editing}
					<p class="mt-2 truncate text-[0.85rem] text-zinc-600">
						#{editing.id}{editing.is_admin ? ' · back-office access' : ''}
					</p>
				{/if}

				<form
					method="POST"
					action={editing ? '?/update' : '?/create'}
					use:enhance={editing ? onUpdate : onCreate}
					class="mt-6 space-y-4"
				>
					{#if editing}
						<input type="hidden" name="id" value={editing.id} />
					{/if}

					<Field
						name="name"
						label="Name"
						required
						placeholder="Ramon Vega"
						value={v.name}
						error={e.name}
					/>

					<Field
						name="email"
						label="Email"
						type="email"
						required
						placeholder="client@example.com"
						value={v.email}
						error={e.email}
						hint={editing
							? 'Changing this changes how they sign in.'
							: 'Must be unique — it is the identity.'}
					/>

					<Field
						name="phone"
						label="Phone"
						type="tel"
						placeholder="+7 900 000-00-00"
						value={v.phone}
						error={e.phone}
					/>

					<button type="submit" class="btn btn-gold w-full" disabled={saving}>
						{#if saving}
							Saving…
						{:else}
							{editing ? 'Save changes' : 'Add client'}
						{/if}
					</button>

					{#if editing}
						<p class="text-center text-[0.85rem] leading-relaxed text-zinc-600">
							Their bookings and orders stay attached.
						</p>
					{/if}
				</form>
			</div>

			<!-- Recent history, so the admin knows whose record this is -->
			{#if editing && data.history.length > 0}
				<div class="card mt-4 p-5">
					<p class="display text-[0.75rem] text-zinc-500">Recent bookings</p>
					<ul class="mt-3 space-y-2">
						{#each data.history as h (h.date + h.time + h.service)}
							<li class="text-[0.9rem] {h.status === 'cancelled' ? 'opacity-50' : ''}">
								<span class="text-zinc-300">{fmt(h.date)} · {h.time}</span>
								<span class="block text-zinc-600">{h.service} · {h.barber}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
</section>
