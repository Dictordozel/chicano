<script>
	import { enhance, applyAction } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';

	/** @type {{ data: { barbers: any[], editing: any }, form: any }} */
	let { data, form } = $props();

	let saving = $state(false);

	let editing = $derived(data.editing);
	// A failed submit wins over the loaded row, so nothing typed is lost.
	let v = $derived(form?.values ?? data.editing ?? {});
	let e = $derived(form?.errors ?? {});

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onCreate = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success' && result.data?.created) {
				pushToast('Barber added', { body: `${result.data.created} now takes bookings.` });
				await update();
			} else {
				if (result.type === 'failure') pushToast('Check the form', { kind: 'error' });
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
				pushToast('Barber updated', { body: 'The crew page is up to date.' });
				await applyAction(result);
				return;
			}
			if (result.type === 'failure') {
				pushToast('Not saved', { body: result.data?.message, kind: 'error' });
			}
			await update({ reset: false });
		};
	};

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const onRemove = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.removed) {
			pushToast('Barber removed', { body: result.data.removed, kind: 'info' });
		} else if (result.type === 'failure') {
			pushToast('Cannot delete', { body: result.data?.message, kind: 'error', duration: 7000 });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>{editing ? 'Edit barber' : 'Barbers'} — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Barbers</h1>
	<p class="mt-2 text-sm text-zinc-500">
		A new barber opens 11 daily slots on the booking page straight away.
	</p>

	<div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
		<!-- ------------------------------------------------------ list -->
		<div>
			<h2 class="display border-b border-zinc-800 pb-4 text-[0.8rem] text-zinc-100">
				Behind the chairs — {data.barbers.length}
			</h2>

			<ul class="divide-y divide-zinc-900">
				{#each data.barbers as b (b.id)}
					<li
						class="-ml-3 flex items-start gap-4 border-l-2 py-4 pl-3 transition-colors {editing?.id ===
						b.id
							? 'border-gold bg-gold/5'
							: 'border-transparent'}"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline gap-2.5">
								<span class="gothic text-2xl text-gold">{b.alias}</span>
								<span class="display text-[0.75rem] text-zinc-500">{b.name}</span>
							</div>
							<p class="mt-1.5 text-[0.95rem] text-zinc-400">{b.specialty}</p>
							<p class="mt-1 line-clamp-2 text-[0.9rem] leading-relaxed text-zinc-600">{b.bio}</p>
							<p class="mt-1.5 text-[0.85rem] text-zinc-600">
								{b.years} yrs · <code class="text-zinc-700">{b.slug}</code>
								{#if b.booked > 0}
									· <span class="text-zinc-500">{b.booked} on the books</span>
								{/if}
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-3">
							<a
								href="?edit={b.id}#editor"
								class="display text-[0.7rem] text-zinc-500 transition-colors hover:text-gold"
								aria-label="Edit {b.alias}"
							>
								Edit
							</a>

							<form method="POST" action="?/remove" use:enhance={onRemove}>
								<input type="hidden" name="id" value={b.id} />
								<button
									type="submit"
									class="p-1 text-zinc-700 transition-colors hover:text-flash"
									aria-label="Delete {b.alias}"
									title={b.booked > 0 ? 'Has bookings on the books' : 'Delete'}
								>
									<Icon name="trash" size="14" />
								</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<!-- ------------------------------------------------------ form -->
		<div class="lg:sticky lg:top-24 lg:self-start">
			<div id="editor" class="card p-6 {editing ? 'border-gold/50' : ''}">
				<div class="flex items-center justify-between gap-3">
					<h2 class="display flex items-center gap-2 text-[0.8rem] text-gold">
						<Icon name={editing ? 'razor' : 'plus'} size="14" stroke={2} />
						{editing ? 'Edit barber' : 'New barber'}
					</h2>
					{#if editing}
						<a
							href="/admin/barbers"
							class="display text-[0.7rem] text-zinc-500 transition-colors hover:text-zinc-200"
						>
							Cancel
						</a>
					{/if}
				</div>

				{#if editing}
					<p class="mt-2 truncate text-[0.85rem] text-zinc-600">#{editing.id} · {editing.alias}</p>
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
						label="Full name"
						required
						placeholder="Ramon Vega"
						value={v.name}
						error={e.name}
					/>

					<Field
						name="alias"
						label="Street name"
						required
						placeholder="El Toro"
						value={v.alias}
						error={e.alias}
						hint="Shown large on the crew and booking cards."
					/>

					<Field
						name="specialty"
						label="Specialty"
						required
						placeholder="Slick backs & pompadours"
						value={v.specialty}
						error={e.specialty}
					/>

					<Field
						name="bio"
						label="Bio"
						type="textarea"
						rows={3}
						placeholder="Fifteen years behind the chair."
						value={v.bio}
						hint="Falls back to the specialty if left blank."
					/>

					<Field
						name="years"
						label="Years of craft"
						type="number"
						required
						min={0}
						max={70}
						value={v.years ?? 5}
						error={e.years}
					/>

					<Field
						name="slug"
						label="Slug"
						placeholder="auto from street name"
						value={v.slug}
						hint={editing ? 'Changing this does not affect existing bookings.' : 'Leave blank to generate one.'}
					/>

					<button type="submit" class="btn btn-gold w-full" disabled={saving}>
						{#if saving}
							Saving…
						{:else}
							{editing ? 'Save changes' : 'Add barber'}
						{/if}
					</button>

					{#if editing}
						<p class="text-center text-[0.85rem] leading-relaxed text-zinc-600">
							Bookings already made stay with this barber under the new name.
						</p>
					{/if}
				</form>
			</div>
		</div>
	</div>
</section>
