<script>
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	/** @type {{ data: { isAdmin: boolean, user: any }, children: import('svelte').Snippet }} */
	let { data, children } = $props();

	const tabs = [
		{ href: '/admin', label: 'Overview', icon: 'crown', exact: true },
		{ href: '/admin/services', label: 'Services', icon: 'scissors' },
		{ href: '/admin/barbers', label: 'Barbers', icon: 'razor' },
		{ href: '/admin/products', label: 'Products', icon: 'bag' },
		{ href: '/admin/appointments', label: 'Bookings', icon: 'calendar' },
		{ href: '/admin/clients', label: 'Clients', icon: 'user' },
		{ href: '/admin/messages', label: 'Messages', icon: 'phone' }
	];

	let path = $derived(page.url.pathname);

	/** @param {{ href: string, exact?: boolean }} tab */
	const active = (tab) => (tab.exact ? path === tab.href : path.startsWith(tab.href));
</script>

<div class="border-b border-zinc-800 bg-black/60">
	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Back-office band: deliberately unlike the storefront header -->
		<div class="flex items-center gap-3 py-4">
			<span class="text-gold"><Icon name="crown" size="17" /></span>
			<p class="display text-[0.8rem] text-gold">Back office</p>
			<span class="h-px flex-1 bg-zinc-800"></span>
			<a
				href="/"
				class="display text-[0.75rem] text-zinc-500 transition-colors hover:text-gold"
			>
				← Storefront
			</a>
		</div>

		{#if data.isAdmin}
			<nav class="flex snap-x gap-1 overflow-x-auto" aria-label="Admin">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						class="display flex shrink-0 snap-start items-center gap-2 border-b-2 px-4 py-3 text-[0.8rem] transition-colors {active(
							tab
						)
							? 'border-gold text-gold'
							: 'border-transparent text-zinc-500 hover:text-zinc-200'}"
						aria-current={active(tab) ? 'page' : undefined}
					>
						<Icon name={tab.icon} size="14" />
						{tab.label}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
</div>

{@render children()}
