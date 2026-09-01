<script>
	import { enhance, applyAction } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte.js';
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';

	/** @type {{ data: { next: string }, form: any }} */
	let { data, form } = $props();

	let submitting = $state(false);

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	const submit = () => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'redirect') {
				pushToast('Welcome to the shop', { body: 'You are signed in. The chair is yours.' });
			}
			await applyAction(result);
		};
	};
</script>

<svelte:head>
	<title>Sign in — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6 sm:py-24">
	<div class="text-center">
		<span class="inline-flex text-gold"><Icon name="razor" size="30" /></span>
		<h1 class="gothic mt-5 text-4xl text-zinc-100 sm:text-5xl">Sign in</h1>
		<p class="mt-3 text-sm leading-relaxed text-zinc-500">
			No passwords in this shop. Leave your name and email, and the chair remembers you.
		</p>
		<Ornament class="mt-7" />
	</div>

	<form method="POST" use:enhance={submit} class="mt-8 space-y-5">
		<input type="hidden" name="next" value={data.next} />

		<div>
			<label class="label" for="name">Your name</label>
			<input
				id="name"
				name="name"
				type="text"
				class="field"
				placeholder="Ramon Vega"
				autocomplete="name"
				required
				value={form?.values?.name ?? ''}
				aria-invalid={form?.errors?.name ? 'true' : undefined}
			/>
			{#if form?.errors?.name}
				<p class="mt-1.5 text-xs text-flash">{form.errors.name}</p>
			{/if}
		</div>

		<div>
			<label class="label" for="email">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				class="field"
				placeholder="you@example.com"
				autocomplete="email"
				inputmode="email"
				required
				value={form?.values?.email ?? ''}
				aria-invalid={form?.errors?.email ? 'true' : undefined}
			/>
			{#if form?.errors?.email}
				<p class="mt-1.5 text-xs text-flash">{form.errors.email}</p>
			{/if}
		</div>

		<div>
			<label class="label" for="phone">Phone <span class="text-zinc-700">— optional</span></label>
			<input
				id="phone"
				name="phone"
				type="tel"
				class="field"
				placeholder="+7 900 000-00-00"
				autocomplete="tel"
				inputmode="tel"
				value={form?.values?.phone ?? ''}
				aria-invalid={form?.errors?.phone ? 'true' : undefined}
			/>
			{#if form?.errors?.phone}
				<p class="mt-1.5 text-xs text-flash">{form.errors.phone}</p>
			{/if}
		</div>

		<button type="submit" class="btn btn-gold w-full" disabled={submitting}>
			{#if submitting}
				Opening the door…
			{:else}
				Take my chair
				<Icon name="arrow" size="15" />
			{/if}
		</button>
	</form>

	<p
		class="mt-8 border border-dashed border-zinc-800 px-4 py-3 text-center text-xs leading-relaxed text-zinc-600"
	>
		Prototype notice — authentication is simulated. The session lives in SQLite and an httpOnly
		cookie; no password is ever checked.
	</p>
</section>
