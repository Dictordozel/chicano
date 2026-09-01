<script>
	import Icon from '$lib/components/Icon.svelte';
	import Ornament from '$lib/components/Ornament.svelte';

	/** @type {{ data: { services: any[], barbers: any[], featured: any[] } }} */
	let { data } = $props();

	let hair = $derived(data.services.filter((s) => s.category === 'hair'));
	let beard = $derived(data.services.filter((s) => s.category === 'beard'));

	const marquee = [
		'Slicked back',
		'Straight razor',
		'Hot towels',
		'Firme hold',
		'Sharp lines',
		'Old school'
	];
</script>

<svelte:head>
	<title>Chicano Barbershop — Old-school cuts, cold steel</title>
</svelte:head>

<!-- ============================================================ HERO -->
<section class="relative overflow-hidden border-b border-zinc-800">
	<!-- Engraved backdrop: pinstripes + a faint gold halo -->
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.07]"
		style="background-image: repeating-linear-gradient(115deg, transparent 0 22px, #d4af37 22px 23px);"
		aria-hidden="true"
	></div>

	<div class="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
		<p class="display flex items-center gap-3 text-[0.8rem] text-gold">
			<span class="h-px w-8 bg-gold"></span>
			Est. 1974 · East Side
		</p>

		<h1 class="mt-6 max-w-3xl">
			<span class="gothic foil block text-[3.5rem] leading-[0.9] sm:text-8xl lg:text-9xl">
				Chicano
			</span>
			<span
				class="display mt-4 block text-[0.95rem] leading-relaxed text-zinc-300 sm:text-base lg:text-lg"
			>
				Barbershop &amp; Straight-razor parlour
			</span>
		</h1>

		<p class="mt-7 max-w-lg text-[1.05rem] leading-relaxed text-zinc-400 sm:text-base">
			Comb-backs, skin fades and beard work done the way it was done before appointments existed —
			slowly, with steel, and with the radio on.
		</p>

		<div class="mt-9 flex flex-col gap-3 sm:flex-row">
			<a href="/booking" class="btn btn-gold">
				<Icon name="calendar" size="15" />
				Book a chair
			</a>
			<a href="/shop" class="btn btn-ghost">
				<Icon name="bag" size="15" />
				Grooming goods
			</a>
		</div>

		<!-- Shop facts -->
		<dl class="mt-14 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-8 sm:max-w-lg sm:gap-8">
			{#each [{ n: '4', l: 'Master barbers' }, { n: '50', l: 'Years on the block' }, { n: '11', l: 'Chairs a day' }] as fact (fact.l)}
				<div>
					<dt class="gothic text-3xl text-gold sm:text-4xl">{fact.n}</dt>
					<dd class="display mt-1 text-[0.75rem] leading-relaxed text-zinc-500">{fact.l}</dd>
				</div>
			{/each}
		</dl>
	</div>
</section>

<!-- ========================================================= MARQUEE -->
<div class="overflow-hidden border-b border-zinc-800 bg-black/50 py-3">
	<div class="flex w-max animate-[slide_38s_linear_infinite] items-center gap-8 pr-8">
		{#each [0, 1] as pass (pass)}
			{#each marquee as word (pass + word)}
				<span class="display flex items-center gap-8 text-[0.8rem] text-zinc-600">
					{word}
					<Icon name="flash" size="11" class="text-gold/50" />
				</span>
			{/each}
		{/each}
	</div>
</div>

<!-- ========================================================= SERVICES -->
<section id="services" class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
	<div class="text-center">
		<p class="display text-[0.8rem] text-gold">The price list</p>
		<h2 class="gothic mt-3 text-4xl text-zinc-100 sm:text-6xl">Services</h2>
		<Ornament icon="scissors" class="mx-auto mt-6 max-w-xs" />
	</div>

	<div class="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
		{#each [{ title: 'Men’s haircuts', sub: 'Chicano silhouettes', icon: 'comb', items: hair }, { title: 'Beard & moustache', sub: 'Steel and steam', icon: 'razor', items: beard }] as group (group.title)}
			<div>
				<div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
					<span class="text-gold"><Icon name={group.icon} size="22" /></span>
					<div>
						<h3 class="display text-[0.9rem] text-zinc-100">{group.title}</h3>
						<p class="mt-1 text-xs text-zinc-500">{group.sub}</p>
					</div>
				</div>

				<ul class="divide-y divide-zinc-900">
					{#each group.items as service (service.id)}
						<li class="group py-5">
							<div class="flex items-baseline gap-3">
								<h4
									class="display text-[0.9rem] text-zinc-200 transition-colors group-hover:text-gold"
								>
									{service.title}
								</h4>
								<span
									class="h-px flex-1 bg-zinc-800 transition-colors group-hover:bg-gold/40"
								></span>
								<span class="gothic text-xl text-gold tabular-nums">{service.price} ₽</span>
							</div>
							<p class="mt-2 max-w-md text-[0.95rem] leading-relaxed text-zinc-500">
								{service.description}
							</p>
							<p class="mt-2 flex items-center gap-1.5 text-[0.85rem] text-zinc-600">
								<Icon name="clock" size="12" />
								{service.duration_min} min · {service.tagline}
							</p>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<div class="mt-12 text-center">
		<a href="/booking" class="btn btn-gold">
			Reserve your time
			<Icon name="arrow" size="15" />
		</a>
	</div>
</section>

<!-- ============================================================= CREW -->
<section class="border-y border-zinc-800 bg-black/40">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="display text-[0.8rem] text-gold">Behind the chairs</p>
				<h2 class="gothic mt-3 text-4xl text-zinc-100 sm:text-5xl">The crew</h2>
			</div>
			<a href="/crew" class="display text-[0.8rem] text-zinc-400 transition-colors hover:text-gold">
				All barbers →
			</a>
		</div>

		<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.barbers as barber (barber.id)}
				<article class="card card-hover p-6">
					<div class="flex items-center justify-between">
						<span class="text-gold/60"><Icon name="star" size="16" /></span>
						<span class="display text-[0.75rem] text-zinc-600">{barber.years} yrs</span>
					</div>
					<h3 class="gothic mt-5 text-2xl text-gold">{barber.alias}</h3>
					<p class="display mt-1 text-[0.75rem] text-zinc-500">{barber.name}</p>
					<p class="mt-4 text-[0.95rem] leading-relaxed text-zinc-400">{barber.specialty}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<!-- ============================================================= SHOP -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="display text-[0.8rem] text-gold">Take the shop home</p>
			<h2 class="gothic mt-3 text-4xl text-zinc-100 sm:text-5xl">The counter</h2>
		</div>
		<a href="/shop" class="display text-[0.8rem] text-zinc-400 transition-colors hover:text-gold">
			Full catalogue →
		</a>
	</div>

	<div class="mt-10 grid gap-4 sm:grid-cols-3">
		{#each data.featured as product (product.id)}
			<a href="/shop#p{product.id}" class="card card-hover group flex flex-col p-6">
				<div class="flex items-start justify-between gap-3">
					<span class="display text-[0.75rem] text-zinc-600">{product.category}</span>
					{#if product.badge}
						<span class="display border border-gold/40 px-2 py-0.5 text-[0.7rem] text-gold">
							{product.badge}
						</span>
					{/if}
				</div>

				<h3
					class="mt-5 text-[1.05rem] leading-snug font-medium text-zinc-200 transition-colors group-hover:text-gold"
				>
					{product.title}
				</h3>

				<p class="mt-auto pt-6">
					<span class="gothic text-2xl text-gold tabular-nums">{product.price} ₽</span>
				</p>
			</a>
		{/each}
	</div>
</section>

<style>
	@keyframes slide {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}
</style>
