<script>
	import Icon from '$lib/components/Icon.svelte';

	/** @type {{ data: { stats: any, todayList: any[], nextUp: any[] } }} */
	let { data } = $props();

	/** @param {string} iso */
	function fmt(iso) {
		const [y, m, d] = iso.split('-').map(Number);
		return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
			.format(new Date(y, m - 1, d));
	}

	let tiles = $derived([
		{ label: 'Services', value: data.stats.services, href: '/admin/services', icon: 'scissors' },
		{ label: 'Barbers', value: data.stats.barbers, href: '/admin/barbers', icon: 'razor' },
		{ label: 'Products', value: data.stats.products, href: '/admin/products', icon: 'bag' },
		{ label: 'Upcoming bookings', value: data.stats.upcoming, href: '/admin/appointments', icon: 'calendar' }
	]);
</script>

<svelte:head>
	<title>Overview — Back office</title>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
	<h1 class="gothic text-4xl text-zinc-100 sm:text-5xl">Overview</h1>
	<p class="mt-2 text-sm text-zinc-500">
		{data.stats.todayCount} booking{data.stats.todayCount === 1 ? '' : 's'} in the chairs today.
	</p>

	<!-- ------------------------------------------------------ tiles -->
	<div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each tiles as tile (tile.label)}
			<a href={tile.href} class="card card-hover group p-5">
				<div class="flex items-center justify-between">
					<span class="text-gold/60 transition-colors group-hover:text-gold">
						<Icon name={tile.icon} size="17" />
					</span>
					<Icon name="chevron" size="13" class="text-zinc-700" />
				</div>
				<p class="gothic mt-4 text-4xl text-gold tabular-nums">{tile.value}</p>
				<p class="display mt-1 text-[0.55rem] text-zinc-500">{tile.label}</p>
			</a>
		{/each}
	</div>

	<!-- ------------------------------------------------ secondary -->
	<dl class="mt-3 grid grid-cols-3 gap-3">
		{#each [{ k: 'Clients', v: data.stats.users, href: '/admin/clients' }, { k: 'Orders', v: data.stats.orders, href: null }, { k: 'Shop revenue', v: `${data.stats.revenue} ₽`, href: null }] as row (row.k)}
			<svelte:element
				this={row.href ? 'a' : 'div'}
				href={row.href}
				class="border border-zinc-800 bg-zinc-900/20 p-4 {row.href
					? 'transition-colors hover:border-gold/50'
					: ''}"
			>
				<dt class="display text-[0.52rem] text-zinc-500">{row.k}</dt>
				<dd class="mt-1.5 text-lg text-zinc-200 tabular-nums">{row.v}</dd>
			</svelte:element>
		{/each}
	</dl>

	<!-- ------------------------------------------------ quick add -->
	<div class="mt-10 flex flex-wrap gap-2">
		<a href="/admin/appointments" class="btn btn-gold">
			<Icon name="plus" size="14" stroke={2} />
			New booking
		</a>
		<a href="/admin/services" class="btn btn-ghost">
			<Icon name="plus" size="14" stroke={2} />
			New service
		</a>
		<a href="/admin/barbers" class="btn btn-ghost">
			<Icon name="plus" size="14" stroke={2} />
			New barber
		</a>
		<a href="/admin/products" class="btn btn-ghost">
			<Icon name="plus" size="14" stroke={2} />
			New product
		</a>
	</div>

	<!-- --------------------------------------------------- today -->
	<h2 class="display mt-14 border-b border-zinc-800 pb-4 text-[0.65rem] text-zinc-100">
		Today's chairs
	</h2>

	{#if data.todayList.length === 0}
		<p class="mt-6 border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
			Nothing booked today.
		</p>
	{:else}
		<ul class="divide-y divide-zinc-900">
			{#each data.todayList as a (a.id)}
				<li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-sm">
					<span class="display w-12 shrink-0 text-[0.62rem] text-gold tabular-nums">{a.time}</span>
					<span class="min-w-0 flex-1 truncate text-zinc-200">{a.service}</span>
					<span class="display shrink-0 text-[0.55rem] text-zinc-500">{a.barber_alias}</span>
					<span class="w-full truncate text-[0.75rem] text-zinc-600 sm:w-auto sm:shrink-0">
						{a.client_name} · {a.client_email}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- ------------------------------------------------- next up -->
	{#if data.nextUp.length > 0}
		<h2 class="display mt-12 border-b border-zinc-800 pb-4 text-[0.65rem] text-zinc-100">
			Coming up
		</h2>
		<ul class="divide-y divide-zinc-900">
			{#each data.nextUp as a (a.id)}
				<li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-sm">
					<span class="w-24 shrink-0 text-[0.72rem] text-zinc-500 tabular-nums">
						{fmt(a.date)} · {a.time}
					</span>
					<span class="min-w-0 flex-1 truncate text-zinc-300">{a.service}</span>
					<span class="display shrink-0 text-[0.55rem] text-zinc-500">{a.barber_alias}</span>
				</li>
			{/each}
		</ul>
		<a
			href="/admin/appointments"
			class="display mt-5 inline-block text-[0.55rem] text-zinc-500 transition-colors hover:text-gold"
		>
			All bookings →
		</a>
	{/if}
</section>
