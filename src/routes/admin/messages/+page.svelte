<script>
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let sending = $state(false);
	let confirm = $state('');

	// Seeded once on purpose: the textarea is the author's working copy, and a
	// recount or a rejected send must not overwrite what they have typed.
	let template = $state(untrack(() => form?.template ?? data.template));

	let e = $derived(form?.errors ?? {});
	let chars = $derived(template.length);
	// A GSM-7 text is 160 chars; Cyrillic falls back to UCS-2 at 70.
	let segments = $derived(Math.max(1, Math.ceil(chars / 70)));

	const STATUS_COLOR = {
		sent: 'text-gold',
		pending: 'text-zinc-300',
		sending: 'text-zinc-300',
		failed: 'text-flash',
		expired: 'text-flash',
		skipped: 'text-zinc-600',
		cancelled: 'text-zinc-600'
	};

	/** @param {number | null} epoch */
	function when(epoch) {
		if (!epoch) return '—';
		return new Intl.DateTimeFormat('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(epoch));
	}

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onBroadcast = () => {
		sending = true;
		return async ({ result, update }) => {
			sending = false;
			if (result.type === 'success' && result.data?.broadcast) {
				const b = result.data.broadcast;
				pushToast('Broadcast sent', {
					body: `${b.sent} delivered, ${b.failed} failed, ${b.skipped} without a phone.`,
					duration: 9000
				});
				confirm = '';
			} else if (result.type === 'failure') {
				const first = Object.values(result.data?.errors ?? {})[0];
				pushToast('Not sent', { body: /** @type {string} */ (first), kind: 'error' });
			}
			await update({ reset: false });
		};
	};

	/** @param {string} title @returns {import('@sveltejs/kit').SubmitFunction} */
	const simple = (title) => () => async ({ result, update }) => {
		if (result.type === 'success') {
			const d = result.data ?? {};
			const body = d.resync
				? `${d.resync.scheduled} reminders queued across ${d.resync.appointments} bookings.`
				: d.drain
					? `${d.drain.sent} sent, ${d.drain.failed} failed, ${d.drain.expired} expired.`
					: d.retry
						? `${d.retry.sent} sent, ${d.retry.failed} failed.`
						: undefined;
			pushToast(title, { body, kind: 'info' });
		} else if (result.type === 'failure') {
			pushToast('Nothing happened', { body: result.data?.message, kind: 'error' });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>Messages — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Messages</h1>
	<p class="mt-2 text-sm text-zinc-500">
		Reminders go out {data.leadTimes.day} h and {data.leadTimes.hour} h before every booking.
		Below that, a broadcast for when the shop has to move people.
	</p>

	<!-- ------------------------------------------------- provider -->
	<div
		class="mt-6 flex flex-wrap items-center gap-3 border px-4 py-3.5 text-[0.78rem] {data.provider
			.ready
			? data.provider.live
				? 'border-gold/50 bg-gold/5 text-zinc-300'
				: 'border-zinc-800 bg-zinc-900/30 text-zinc-400'
			: 'border-flash bg-flash/5 text-zinc-200'}"
	>
		<span class={data.provider.live ? 'text-gold' : 'text-zinc-500'}>
			<Icon name="phone" size="15" />
		</span>
		<span class="display text-[0.55rem]">{data.provider.name}</span>
		<span class="flex-1">{data.provider.detail}</span>
		{#if !data.provider.live}
			<code class="text-[0.7rem] text-zinc-600">SMS_PROVIDER=smsru SMS_API_KEY=…</code>
		{/if}
	</div>

	<!-- ---------------------------------------------------- stats -->
	<dl class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
		{#each [{ k: 'Queued', v: data.stats.byStatus.pending, hint: data.stats.nextAt ? `next ${when(data.stats.nextAt)}` : 'nothing due' }, { k: 'Sent', v: data.stats.byStatus.sent }, { k: 'Failed', v: data.stats.byStatus.failed }, { k: 'No phone', v: data.stats.byStatus.skipped }, { k: 'Expired', v: data.stats.byStatus.expired }] as row (row.k)}
			<div class="border border-zinc-800 bg-zinc-900/20 p-4">
				<dt class="display text-[0.52rem] text-zinc-500">{row.k}</dt>
				<dd class="mt-1.5 text-lg text-zinc-200 tabular-nums">{row.v}</dd>
				{#if row.hint}<dd class="mt-0.5 text-[0.62rem] text-zinc-600">{row.hint}</dd>{/if}
			</div>
		{/each}
	</dl>

	<div class="mt-4 flex flex-wrap gap-2">
		<form method="POST" action="?/drain" use:enhance={simple('Queue drained')}>
			<button type="submit" class="btn btn-ghost !px-4 !py-2 text-[0.55rem]">Send anything due now</button>
		</form>
		<form method="POST" action="?/resync" use:enhance={simple('Reminders rebuilt')}>
			<button type="submit" class="btn btn-ghost !px-4 !py-2 text-[0.55rem]">Rebuild reminders</button>
		</form>
	</div>

	<!-- ================================================ broadcast -->
	<h2 class="display mt-14 flex items-center gap-2 border-b border-zinc-800 pb-4 text-[0.65rem] text-gold">
		<Icon name="flash" size="14" />
		Force-majeure broadcast
	</h2>

	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<div>
			<!-- Audience is a GET form: the selection lives in the URL and the
			     recipient count opposite updates without sending anything. -->
			<form method="GET" class="grid gap-3 sm:grid-cols-2">
				<input type="hidden" name="template" value={template} />

				<Field
					name="scope"
					label="Who"
					type="select"
					value={data.filter.scope}
					options={[
						{ value: 'today', label: 'Everyone booked today' },
						{ value: 'date', label: 'A specific day' },
						{ value: 'range', label: 'A range of days' },
						{ value: 'upcoming', label: 'Everyone upcoming' }
					]}
				/>

				<Field
					name="barberId"
					label="Barber"
					type="select"
					value={data.filter.barberId}
					options={[
						{ value: 0, label: 'All barbers' },
						...data.barbers.map((b) => ({ value: b.id, label: b.alias }))
					]}
				/>

				<Field name="date" label="From" type="date" value={data.filter.date} />
				<Field name="until" label="To" type="date" value={data.filter.until} hint="Used for a range." />

				<div class="sm:col-span-2">
					<button type="submit" class="btn btn-ghost !px-4 !py-2 text-[0.55rem]">
						Recount recipients
					</button>
				</div>
			</form>

			<form method="POST" action="?/broadcast" use:enhance={onBroadcast} class="mt-6 space-y-4">
				<input type="hidden" name="scope" value={data.filter.scope} />
				<input type="hidden" name="date" value={data.filter.date} />
				<input type="hidden" name="until" value={data.filter.until} />
				<input type="hidden" name="barberId" value={data.filter.barberId} />

				<div>
					<label class="label" for="f-template">Message</label>
					<textarea
						id="f-template"
						name="template"
						rows="5"
						class="field resize-none"
						bind:value={template}
						aria-invalid={e.template ? 'true' : undefined}
					></textarea>
					<div class="mt-1.5 flex flex-wrap justify-between gap-3 text-[0.68rem]">
						<span class="text-zinc-600">
							Placeholders: <code class="text-zinc-500">{'{name} {date} {time} {service} {barber}'}</code>
						</span>
						<span class="text-zinc-600 tabular-nums">
							{chars} chars · {segments} SMS
						</span>
					</div>
					{#if e.template}<p class="mt-1.5 text-xs text-flash">{e.template}</p>{/if}
				</div>

				<div class="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-end">
					<div>
						<label class="label" for="f-confirm">Type {data.preview.reachable} to confirm</label>
						<input
							id="f-confirm"
							name="confirm"
							inputmode="numeric"
							class="field"
							bind:value={confirm}
							aria-invalid={e.confirm ? 'true' : undefined}
						/>
					</div>
					<button
						type="submit"
						class="btn btn-gold"
						disabled={sending || data.preview.reachable === 0 || !data.provider.ready}
					>
						{#if sending}
							Sending…
						{:else}
							Send to {data.preview.reachable} client{data.preview.reachable === 1 ? '' : 's'}
						{/if}
					</button>
				</div>
				{#if e.confirm}<p class="text-xs text-flash">{e.confirm}</p>{/if}
			</form>
		</div>

		<!-- ---------------------------------------------- audience -->
		<aside class="card p-5">
			<p class="display text-[0.55rem] text-zinc-500">This selection</p>

			<p class="gothic mt-3 text-4xl text-gold tabular-nums">{data.preview.reachable}</p>
			<p class="text-[0.7rem] text-zinc-500">
				reachable of {data.preview.total} booking{data.preview.total === 1 ? '' : 's'}
			</p>

			{#if data.preview.unreachable.length > 0}
				<div class="mt-5 border-t border-zinc-800 pt-4">
					<p class="display text-[0.5rem] text-flash">
						{data.preview.unreachable.length} without a phone
					</p>
					<ul class="mt-2 space-y-1">
						{#each data.preview.unreachable.slice(0, 6) as u (u.email + u.time)}
							<li class="truncate text-[0.7rem] text-zinc-600">
								{u.name} · {u.date} {u.time}
							</li>
						{/each}
					</ul>
					<p class="mt-2 text-[0.65rem] leading-relaxed text-zinc-600">
						Call these clients — they will not get the text.
					</p>
				</div>
			{/if}

			{#if data.preview.sample.length > 0}
				<div class="mt-5 border-t border-zinc-800 pt-4">
					<p class="display text-[0.5rem] text-zinc-500">Preview</p>
					<p class="mt-2 border border-zinc-800 bg-black/40 p-3 text-[0.7rem] leading-relaxed text-zinc-400">
						{data.preview.sample[0].body}
					</p>
					<p class="mt-1.5 text-[0.62rem] text-zinc-600">to {data.preview.sample[0].phone}</p>
				</div>
			{/if}
		</aside>
	</div>

	<!-- ================================================== outbox -->
	<div class="mt-14 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
		<h2 class="display text-[0.65rem] text-zinc-100">Outbox — {data.outbox.length} shown</h2>

		<form method="GET" class="flex flex-wrap items-center gap-2">
			<select name="status" class="field !w-auto !py-1.5 !text-[0.75rem]">
				{#each ['all', 'pending', 'sent', 'failed', 'skipped', 'expired', 'cancelled'] as s (s)}
					<option value={s} selected={data.statusFilter === s}>{s}</option>
				{/each}
			</select>
			<select name="kind" class="field !w-auto !py-1.5 !text-[0.75rem]">
				{#each ['all', 'reminder_day', 'reminder_hour', 'broadcast'] as k (k)}
					<option value={k} selected={data.kindFilter === k}>{k}</option>
				{/each}
			</select>
			<button
				type="submit"
				class="display border border-zinc-800 px-3 py-2 text-[0.5rem] text-zinc-400 transition-colors hover:border-gold hover:text-gold"
			>
				Filter
			</button>
		</form>
	</div>

	{#if data.outbox.length === 0}
		<p class="mt-6 border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
			Nothing in the outbox for this filter.
		</p>
	{:else}
		<ul class="divide-y divide-zinc-900">
			{#each data.outbox as m (m.id)}
				<li class="flex flex-wrap items-start gap-x-4 gap-y-2 py-4">
					<span class="display w-24 shrink-0 pt-0.5 text-[0.5rem] {STATUS_COLOR[m.status] ?? 'text-zinc-500'}">
						{m.status}
					</span>

					<div class="min-w-0 flex-1">
						<p class="text-[0.8rem] leading-relaxed text-zinc-300">{m.body}</p>
						<p class="mt-1.5 flex flex-wrap gap-x-3 text-[0.66rem] text-zinc-600">
							<span class="text-zinc-500">{m.kind}</span>
							<span>{m.client_name ?? '—'}</span>
							<span>{m.phone ?? 'no phone'}</span>
							{#if m.appt_date}<span>slot {m.appt_date} {m.appt_time}</span>{/if}
							<span>due {when(m.send_at)}</span>
							{#if m.sent_at}<span class="text-gold/60">sent {m.sent_at}</span>{/if}
							{#if m.error}<span class="text-flash">{m.error}</span>{/if}
						</p>
					</div>

					{#if m.status === 'failed' || m.status === 'expired'}
						<form method="POST" action="?/retry" use:enhance={simple('Retried')} class="shrink-0">
							<input type="hidden" name="id" value={m.id} />
							<button
								type="submit"
								class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-gold"
							>
								Retry
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<p class="mt-8 text-center text-[0.72rem] leading-relaxed text-zinc-600">
		Reminders are queued the moment a booking is made and follow it when it moves or is
		cancelled. A message is never sent twice, and one more than 6 h overdue is dropped rather
		than delivered late.
	</p>
</section>
