<script>
	import { enhance, applyAction } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Field from '$lib/components/Field.svelte';
	import ProductArt from '$lib/components/ProductArt.svelte';

	/** @type {{ data: { products: any[], categories: string[], editing: any }, form: any }} */
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
				pushToast('Product added', { body: `${result.data.created} is on the shelf.` });
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
				pushToast('Product updated', { body: 'The shelf is up to date.' });
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
			pushToast('Product removed', { body: result.data.removed, kind: 'info' });
		}
		await update({ reset: false });
	};
</script>

<svelte:head>
	<title>{editing ? 'Edit product' : 'Products'} — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Products</h1>
	<p class="mt-2 text-sm text-zinc-500">
		Appears on <a href="/shop" class="text-gold hover:underline">/shop</a> with a marketplace link and
		an in-app cart button.
	</p>

	<div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
		<!-- ------------------------------------------------------ list -->
		<div>
			<h2 class="display border-b border-zinc-800 pb-4 text-[0.62rem] text-zinc-100">
				On the shelf — {data.products.length}
			</h2>

			<ul class="divide-y divide-zinc-900">
				{#each data.products as p (p.id)}
					<li
						class="-ml-3 flex items-start gap-4 border-l-2 py-4 pl-3 transition-colors {editing?.id ===
						p.id
							? 'border-gold bg-gold/5'
							: 'border-transparent'}"
					>
						<div class="hidden w-16 shrink-0 sm:block">
							<ProductArt slug={p.slug} category={p.category} class="!aspect-square !border-0" />
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="display border border-zinc-700 px-1.5 py-0.5 text-[0.48rem] text-zinc-400">
									{p.category}
								</span>
								{#if p.badge}
									<span class="display border border-gold/40 px-1.5 py-0.5 text-[0.48rem] text-gold">
										{p.badge}
									</span>
								{/if}
								<span class="display text-[0.5rem] text-zinc-600">{p.brand}</span>
							</div>

							<p class="mt-2 text-[0.88rem] leading-snug font-medium text-zinc-100">{p.title}</p>
							<p class="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-zinc-500">
								{p.description}
							</p>
							<p class="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.68rem] text-zinc-600">
								{#if p.volume}<span>{p.volume}</span>·{/if}
								<code class="text-zinc-700">{p.slug}</code>
								·
								<a
									href={p.url}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1 transition-colors hover:text-gold"
								>
									link <Icon name="external" size="10" />
								</a>
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-3">
							<span class="gothic text-xl text-gold tabular-nums">{p.price} ₽</span>

							<a
								href="?edit={p.id}#editor"
								class="display text-[0.5rem] text-zinc-500 transition-colors hover:text-gold"
								aria-label="Edit {p.title}"
							>
								Edit
							</a>

							<form method="POST" action="?/remove" use:enhance={onRemove}>
								<input type="hidden" name="id" value={p.id} />
								<button
									type="submit"
									class="p-1 text-zinc-700 transition-colors hover:text-flash"
									aria-label="Delete {p.title}"
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
						<Icon name={editing ? 'bag' : 'plus'} size="14" stroke={2} />
						{editing ? 'Edit product' : 'New product'}
					</h2>
					{#if editing}
						<a
							href="/admin/products"
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
						placeholder="Помада для укладки волос…"
						value={v.title}
						error={e.title}
					/>

					<div class="grid grid-cols-2 gap-3">
						<Field
							name="brand"
							label="Brand"
							required
							placeholder="Suavecito"
							value={v.brand}
							error={e.brand}
						/>
						<Field name="volume" label="Volume" placeholder="113 г" value={v.volume} />
					</div>

					<Field
						name="category"
						label="Category"
						required
						placeholder="Волосы"
						value={v.category}
						error={e.category}
						hint="In use: {data.categories.join(', ')}"
					/>

					<Field
						name="description"
						label="Description"
						type="textarea"
						required
						rows={3}
						placeholder="Сильная фиксация с умеренным блеском…"
						value={v.description}
						error={e.description}
					/>

					<div class="grid grid-cols-2 gap-3">
						<Field
							name="price"
							label="Price, ₽"
							type="number"
							required
							min={0}
							step={10}
							value={v.price ?? 1500}
							error={e.price}
						/>
						<Field name="badge" label="Badge" placeholder="Matte" value={v.badge} />
					</div>

					<Field
						name="url"
						label="Marketplace link"
						type="url"
						placeholder="https://ozon.ru"
						value={v.url}
						error={e.url}
						hint="Opens in a new tab. Defaults to ozon.ru."
					/>

					<Field
						name="slug"
						label="Slug"
						placeholder="auto from title"
						value={v.slug}
						hint={editing
							? 'Changing this changes the product anchor on /shop.'
							: 'Cyrillic titles are transliterated.'}
					/>

					<button type="submit" class="btn btn-gold w-full" disabled={saving}>
						{#if saving}
							Saving…
						{:else}
							{editing ? 'Save changes' : 'Add product'}
						{/if}
					</button>

					{#if editing}
						<p class="text-center text-[0.68rem] leading-relaxed text-zinc-600">
							Orders already placed keep the price they were paid at.
						</p>
					{/if}
				</form>
			</div>
		</div>
	</div>
</section>
