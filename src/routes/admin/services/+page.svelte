<script>
	import { enhance, applyAction } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';

	/** @type {{ data: { services: any[], editing: any }, form: any }} */
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
				pushToast('Service added', { body: `${result.data.created} is now on the price list.` });
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
				pushToast('Service updated', { body: 'The price list is up to date.' });
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
			pushToast('Service removed', { body: result.data.removed, kind: 'info' });
		} else if (result.type === 'failure') {
			pushToast('Cannot delete', { body: result.data?.message, kind: 'error', duration: 7000 });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>{editing ? 'Edit service' : 'Services'} — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Services</h1>
	<p class="mt-2 text-sm text-zinc-500">
		Everything here shows on the price list and in the booking picker.
	</p>

	<div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
		<!-- ------------------------------------------------------ list -->
		<div>
			<h2 class="display border-b border-zinc-800 pb-4 text-[0.62rem] text-zinc-100">
				On the list — {data.services.length}
			</h2>

			<ul class="divide-y divide-zinc-900">
				{#each data.services as s (s.id)}
					<li
						class="flex flex-wrap items-start gap-x-4 gap-y-2 py-4 pl-3 -ml-3 border-l-2 transition-colors {editing?.id ===
						s.id
							? 'border-gold bg-gold/5'
							: 'border-transparent'}"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span
									class="display border px-1.5 py-0.5 text-[0.48rem] {s.category === 'hair'
										? 'border-gold/40 text-gold'
										: 'border-zinc-700 text-zinc-400'}"
								>
									{s.category}
								</span>
								<span class="display text-[0.65rem] text-zinc-100">{s.title}</span>
							</div>
							<p class="mt-1.5 line-clamp-2 text-[0.78rem] leading-relaxed text-zinc-500">
								{s.description}
							</p>
							<p class="mt-1.5 text-[0.68rem] text-zinc-600">
								{s.duration_min} min · {s.tagline} ·
								<code class="text-zinc-700">{s.slug}</code>
								{#if s.booked > 0}
									· <span class="text-zinc-500">{s.booked} booked</span>
								{/if}
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-3">
							<span class="gothic text-xl text-gold tabular-nums">{s.price} ₽</span>

							<a
								href="?edit={s.id}#editor"
								class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-gold"
								aria-label="Edit {s.title}"
							>
								Edit
							</a>

							<form method="POST" action="?/remove" use:enhance={onRemove}>
								<input type="hidden" name="id" value={s.id} />
								<button
									type="submit"
									class="p-1 text-zinc-700 transition-colors hover:text-flash"
									aria-label="Delete {s.title}"
									title={s.booked > 0 ? 'Used by existing bookings' : 'Delete'}
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
					<h2 class="display flex items-center gap-2 text-[0.62rem] text-gold">
						<Icon name={editing ? 'razor' : 'plus'} size="14" stroke={2} />
						{editing ? 'Edit service' : 'New service'}
					</h2>
					{#if editing}
						<a
							href="/admin/services"
							class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-zinc-200"
						>
							Cancel
						</a>
					{/if}
				</div>

				{#if editing}
					<p class="mt-2 truncate text-[0.7rem] text-zinc-600">#{editing.id} · {editing.title}</p>
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
						name="title"
						label="Title"
						required
						placeholder="Slicked Back"
						value={v.title}
						error={e.title}
					/>

					<Field
						name="category"
						label="Category"
						type="select"
						required
						value={v.category ?? 'hair'}
						error={e.category}
						options={[
							{ value: 'hair', label: 'Men’s haircuts' },
							{ value: 'beard', label: 'Beard & moustache' }
						]}
					/>

					<Field
						name="tagline"
						label="Tagline"
						placeholder="The Chicano signature"
						value={v.tagline}
						hint="Short line under the title. Filled in automatically if left blank."
					/>

					<Field
						name="description"
						label="Description"
						type="textarea"
						required
						rows={3}
						placeholder="Tight sides, long top, combed back hard."
						value={v.description}
						error={e.description}
					/>

					<div class="grid grid-cols-2 gap-3">
						<Field
							name="duration_min"
							label="Minutes"
							type="number"
							required
							min={5}
							max={480}
							step={5}
							value={v.duration_min ?? 45}
							error={e.duration_min}
						/>
						<Field
							name="price"
							label="Price, ₽"
							type="number"
							required
							min={0}
							step={50}
							value={v.price ?? 2000}
							error={e.price}
						/>
					</div>

					<Field
						name="slug"
						label="Slug"
						placeholder="auto from title"
						value={v.slug}
						hint={editing
							? 'Changing this changes the service URL.'
							: 'Leave blank to generate one.'}
					/>

					<button type="submit" class="btn btn-gold w-full" disabled={saving}>
						{#if saving}
							Saving…
						{:else}
							{editing ? 'Save changes' : 'Add service'}
						{/if}
					</button>

					{#if editing}
						<p class="text-center text-[0.68rem] leading-relaxed text-zinc-600">
							Existing bookings keep the price they were made at.
						</p>
					{/if}
				</form>
			</div>
		</div>
	</div>
</section>
