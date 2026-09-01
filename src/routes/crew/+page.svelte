<script>
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';

	/** @type {{ data: { barbers: any[] } }} */
	let { data } = $props();
</script>

<svelte:head>
	<title>The crew — Chicano Barbershop</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
	<div class="text-center">
		<p class="display text-[0.6rem] text-gold">Behind the chairs</p>
		<h1 class="gothic mt-3 text-4xl text-zinc-100 sm:text-6xl">The crew</h1>
		<p class="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
			Four pairs of hands, one standard. Pick the one whose work you want on your head.
		</p>
		<Ornament icon="star" class="mx-auto mt-6 max-w-xs" />
	</div>

	<div class="mt-12 grid gap-4 sm:grid-cols-2">
		{#each data.barbers as barber (barber.id)}
			<article class="card card-hover flex flex-col p-7">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="gothic text-3xl text-gold">{barber.alias}</h2>
						<p class="display mt-1.5 text-[0.55rem] text-zinc-500">{barber.name}</p>
					</div>
					<span class="flex items-center gap-1.5 text-gold/50">
						<Icon name="star" size="15" fill />
						<span class="display text-[0.55rem] text-zinc-600">{barber.years} yrs</span>
					</span>
				</div>

				<p class="mt-5 flex items-center gap-2 text-[0.78rem] text-zinc-300">
					<span class="text-gold/60"><Icon name="scissors" size="13" /></span>
					{barber.specialty}
				</p>

				<p class="mt-4 text-[0.85rem] leading-relaxed text-zinc-500">{barber.bio}</p>

				<div class="mt-7 flex items-center justify-between gap-4 border-t border-zinc-800 pt-5">
					<span class="display text-[0.55rem] {barber.freeToday ? 'text-gold' : 'text-zinc-600'}">
						{barber.freeToday ? `${barber.freeToday} slots free today` : 'Fully booked today'}
					</span>
					<a href="/booking" class="btn btn-ghost !px-4 !py-2 text-[0.55rem]">
						Book
						<Icon name="arrow" size="13" />
					</a>
				</div>
			</article>
		{/each}
	</div>
</section>
