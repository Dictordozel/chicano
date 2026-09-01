<script>
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';

	/** @type {{ data: { next: string, user: any }, form: any }} */
	let { data, form } = $props();
</script>

<svelte:head>
	<title>Back office — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto max-w-sm px-4 py-16 sm:py-24">
	<div class="text-center">
		<span class="inline-flex text-gold"><Icon name="crown" size="30" /></span>
		<h1 class="gothic mt-5 text-4xl text-zinc-100">Locked</h1>
		<p class="mt-3 text-sm leading-relaxed text-zinc-500">
			Signed in as <span class="text-zinc-300">{data.user.name}</span>, but without back-office
			rights. Enter the shop passcode to unlock them.
		</p>
		<Ornament class="mt-7" />
	</div>

	<form method="POST" use:enhance class="mt-8 space-y-5">
		<input type="hidden" name="next" value={data.next} />

		<div>
			<label class="label" for="passcode">Passcode</label>
			<input
				id="passcode"
				name="passcode"
				type="password"
				class="field"
				autocomplete="off"
				required
				aria-invalid={form?.error ? 'true' : undefined}
			/>
			{#if form?.error}
				<p class="mt-1.5 text-xs text-flash">{form.error}</p>
			{/if}
		</div>

		<button type="submit" class="btn btn-gold w-full">
			Unlock
			<Icon name="arrow" size="15" />
		</button>
	</form>

	<p
		class="mt-8 border border-dashed border-zinc-800 px-4 py-3 text-center text-xs leading-relaxed text-zinc-600"
	>
		Prototype gate — the default passcode is <code class="text-gold">chicano</code>. Override it with
		<code class="text-zinc-400">ADMIN_PASSCODE</code> in <code class="text-zinc-400">.env</code>.
	</p>
</section>
