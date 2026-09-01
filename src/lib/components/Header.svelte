<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import Icon from './Icon.svelte';

	/** @type {{ user: { name: string, email: string, is_admin: number } | null, cartCount: number }} */
	let { user, cartCount } = $props();

	let open = $state(false);

	let links = $derived([
		{ href: '/booking', label: 'Book' },
		{ href: '/shop', label: 'Shop' },
		{ href: '/crew', label: 'Crew' },
		{ href: '/account', label: 'My chair' },
		...(user?.is_admin ? [{ href: '/admin', label: 'Admin' }] : [])
	]);

	// `page.url.pathname` is a rune-backed value — this recomputes on navigation.
	let path = $derived(page.url.pathname);

	/** @param {string} href */
	const isActive = (href) => path === href || path.startsWith(href + '/');

	// Close the mobile drawer whenever the route changes.
	$effect(() => {
		path;
		open = false;
	});
</script>

<svelte:head>
	{#if open}
		<style>
			body {
				overflow: hidden;
			}
		</style>
	{/if}
</svelte:head>

<header
	class="sticky top-0 z-50 border-b border-zinc-800 bg-ink/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink/70"
>
	<div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:h-20 sm:px-6">
		<!-- Wordmark -->
		<a href="/" class="group flex items-baseline gap-2" aria-label="Chicano Barbershop, home">
			<span class="gothic foil text-2xl leading-none sm:text-3xl">Chicano</span>
			<span
				class="display hidden text-[0.55rem] text-zinc-600 transition-colors group-hover:text-gold sm:inline"
			>
				Est. 1974
			</span>
		</a>

		<!-- Desktop nav -->
		<nav class="ml-auto hidden items-center gap-7 md:flex" aria-label="Main">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="display relative py-1 text-[0.65rem] transition-colors {isActive(link.href)
						? 'text-gold'
						: 'text-zinc-400 hover:text-zinc-100'}"
					aria-current={isActive(link.href) ? 'page' : undefined}
				>
					{link.label}
					{#if isActive(link.href)}
						<span class="absolute -bottom-0.5 left-0 h-px w-full bg-gold"></span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-1 md:ml-6 md:gap-2">
			<!-- Cart -->
			<a
				href="/cart"
				class="relative flex h-10 w-10 items-center justify-center border border-transparent text-zinc-300 transition-colors hover:border-zinc-800 hover:text-gold"
				aria-label="Cart{cartCount ? `, ${cartCount} items` : ', empty'}"
			>
				<Icon name="cart" size="19" />
				{#if cartCount > 0}
					<span
						class="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center bg-gold px-1 text-[0.6rem] font-semibold text-black tabular-nums"
					>
						{cartCount}
					</span>
				{/if}
			</a>

			<!-- Account / auth -->
			{#if user}
				<form method="POST" action="/logout" use:enhance class="hidden md:block">
					<button
						type="submit"
						class="flex h-10 items-center gap-2 border border-zinc-800 px-3 text-zinc-400 transition-colors hover:border-gold hover:text-gold"
						title="Sign out {user.name}"
					>
						<Icon name="user" size="16" />
						<span class="display max-w-24 truncate text-[0.6rem]">{user.name}</span>
					</button>
				</form>
			{:else}
				<a href="/login" class="btn btn-ghost hidden h-10 !px-4 !py-0 md:inline-flex">Sign in</a>
			{/if}

			<!-- Mobile menu toggle -->
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center text-zinc-300 transition-colors hover:text-gold md:hidden"
				onclick={() => (open = !open)}
				aria-expanded={open}
				aria-controls="mobile-menu"
				aria-label={open ? 'Close menu' : 'Open menu'}
			>
				{#if open}
					<Icon name="close" size="22" stroke={1.8} />
				{:else}
					<span class="flex w-5.5 flex-col gap-1.5">
						<span class="h-px w-full bg-current"></span>
						<span class="h-px w-full bg-current"></span>
						<span class="h-px w-3/5 bg-current"></span>
					</span>
				{/if}
			</button>
		</div>
	</div>
</header>

<!-- Mobile drawer -->
{#if open}
	<div
		id="mobile-menu"
		transition:fly={{ y: -12, duration: 200 }}
		class="fixed inset-x-0 top-16 z-40 border-b border-zinc-800 bg-ink/98 backdrop-blur-md md:hidden"
	>
		<nav class="flex flex-col px-4 py-2" aria-label="Mobile">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="display flex items-center justify-between border-b border-zinc-900 py-4 text-[0.75rem] transition-colors {isActive(
						link.href
					)
						? 'text-gold'
						: 'text-zinc-300'}"
				>
					{link.label}
					<Icon name="chevron" size="15" class="opacity-40" />
				</a>
			{/each}

			<div class="py-4">
				{#if user}
					<form method="POST" action="/logout" use:enhance>
						<button type="submit" class="btn btn-ghost w-full">
							<Icon name="logout" size="15" />
							Sign out — {user.name}
						</button>
					</form>
				{:else}
					<a href="/login" class="btn btn-gold w-full">
						<Icon name="user" size="15" />
						Sign in
					</a>
				{/if}
			</div>
		</nav>
	</div>
{/if}
