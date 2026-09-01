<script>
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';
	import Field from './Field.svelte';

	/**
	 * Create/edit form for a booking. Its own barber and date state drives the
	 * slot picker, so the parent remounts it (via `{#key}`) whenever the edit
	 * target changes — otherwise a stale selection would survive the switch.
	 *
	 * @type {{
	 *   services: any[], barbers: any[], slots: string[],
	 *   availability: Record<number, Record<string, string[]>>,
	 *   windowStart: string, windowEnd: string,
	 *   editing?: any, values?: any, errors?: Record<string, string>,
	 *   saving?: boolean,
	 *   submit: import('@sveltejs/kit').SubmitFunction
	 * }}
	 */
	let {
		services,
		barbers,
		slots,
		availability,
		windowStart,
		windowEnd,
		editing = null,
		values = {},
		errors = {},
		saving = false,
		submit
	} = $props();

	// Captured once per mount: `values` already carries the edited row, or what
	// the visitor typed before a failed submit.
	const initial = untrack(() => ({
		barberId: values.barberId ?? barbers[0]?.id,
		date: values.date ?? windowStart
	}));

	let barberId = $state(initial.barberId);
	let date = $state(initial.date);

	// Known only inside the preloaded window; beyond it the server has the final
	// say and the picker simply offers every slot.
	let known = $derived(Boolean(availability[barberId]?.[date]));
	let free = $derived(availability[barberId]?.[date] ?? slots);

	let timeOptions = $derived(
		slots.map((t) => ({
			value: t,
			label: known && !free.includes(t) ? `${t} — taken` : t
		}))
	);
</script>

<div id="editor" class="card p-6 {editing ? 'border-gold/50' : ''}">
	<div class="flex items-center justify-between gap-3">
		<h2 class="display flex items-center gap-2 text-[0.62rem] text-gold">
			<Icon name={editing ? 'calendar' : 'plus'} size="14" stroke={2} />
			{editing ? 'Edit booking' : 'New booking'}
		</h2>
		{#if editing}
			<a
				href="/admin/appointments"
				class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-zinc-200"
			>
				Cancel
			</a>
		{/if}
	</div>

	{#if editing}
		<p class="mt-2 truncate text-[0.7rem] text-zinc-600">
			#{editing.id} · {editing.status}{editing.price ? ` · quoted ${editing.price} ₽` : ''}
		</p>
	{/if}

	<form
		method="POST"
		action={editing ? '?/update' : '?/create'}
		use:enhance={submit}
		class="mt-6 space-y-4"
	>
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}

		<Field
			name="email"
			label="Client email"
			type="email"
			required
			placeholder="client@example.com"
			value={values.email}
			error={errors.email}
			hint={editing
				? 'A different email moves the booking to that client.'
				: 'Existing clients are matched by email.'}
		/>

		<Field
			name="name"
			label="Client name"
			required
			placeholder="Ramon Vega"
			value={values.name}
			error={errors.name}
		/>

		<Field
			name="phone"
			label="Phone"
			type="tel"
			placeholder="+7 900 000-00-00"
			value={values.phone}
		/>

		<Field
			name="serviceId"
			label="Service"
			type="select"
			required
			value={values.serviceId ?? services[0]?.id}
			error={errors.serviceId}
			options={services.map((s) => ({ value: s.id, label: `${s.title} — ${s.price} ₽` }))}
			hint={editing ? 'Changing the service re-quotes it at the current price.' : ''}
		/>

		<div>
			<label class="label" for="f-barberId">Barber</label>
			<select id="f-barberId" name="barberId" class="field" bind:value={barberId} required>
				{#each barbers as b (b.id)}
					<option value={b.id}>{b.alias} — {b.name}</option>
				{/each}
			</select>
			{#if errors.barberId}<p class="mt-1.5 text-xs text-flash">{errors.barberId}</p>{/if}
		</div>

		<div>
			<label class="label" for="f-date">Date</label>
			<input
				id="f-date"
				name="date"
				type="date"
				class="field"
				min={windowStart}
				bind:value={date}
				required
			/>
			{#if errors.date}
				<p class="mt-1.5 text-xs text-flash">{errors.date}</p>
			{:else}
				<p class="mt-1.5 text-[0.7rem] text-zinc-600">
					{#if known}
						{free.length} of {slots.length} slots free
					{:else}
						Beyond {windowEnd} — availability is checked on save.
					{/if}
				</p>
			{/if}
		</div>

		<Field
			name="time"
			label="Time"
			type="select"
			required
			value={values.time ?? free[0]}
			error={errors.time}
			options={timeOptions}
		/>

		<Field
			name="note"
			label="Note"
			type="textarea"
			rows={2}
			placeholder="Regular — usual fade."
			value={values.note}
		/>

		<button type="submit" class="btn btn-gold w-full" disabled={saving}>
			{#if saving}
				Saving…
			{:else}
				{editing ? 'Save changes' : 'Create booking'}
			{/if}
		</button>

		{#if editing}
			<p class="text-center text-[0.68rem] leading-relaxed text-zinc-600">
				Moving the day, time or barber keeps the price the client was quoted.
			</p>
		{/if}
	</form>
</div>
