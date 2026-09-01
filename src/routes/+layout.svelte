<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toaster from '$lib/components/Toaster.svelte';

	/** @type {{ data: { user: any, cartCount: number }, children: import('svelte').Snippet }} */
	let { data, children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<Header user={data.user} cartCount={data.cartCount} />

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>

<Toaster />
