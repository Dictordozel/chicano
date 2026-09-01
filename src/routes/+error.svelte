<script>
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:py-32">
	<p class="gothic foil text-8xl leading-none">{page.status}</p>
	<p class="display mt-6 text-[0.7rem] text-zinc-300">
		{page.error?.message ?? 'Something went sideways'}
	</p>
	<p class="mt-4 text-sm leading-relaxed text-zinc-500">
		This chair does not exist. Try the front door.
	</p>
	<a href="/" class="btn btn-gold mt-9">Back to the shop</a>
</section>
