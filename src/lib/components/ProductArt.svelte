<script>
	/**
	 * Generated bottle/tin artwork — the prototype ships no photography, so each
	 * product gets a deterministic engraved silhouette derived from its slug.
	 *
	 * @type {{ slug: string, category: string, class?: string }}
	 */
	let { slug, category, class: className = '' } = $props();

	/** Tins for clays and pomades, tall bottles for oils and creams. */
	let shape = $derived(
		/pomade|matte|clay|firme|reuzel|suavecito/i.test(slug) ? 'tin' : 'bottle'
	);

	// Cheap deterministic hash so the same product always gets the same tilt.
	let seed = $derived([...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7));
	let tilt = $derived((seed % 9) - 4);
</script>

<div
	class="relative flex aspect-4/3 items-center justify-center overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-black {className}"
>
	<!-- pinstripe backdrop -->
	<div
		class="absolute inset-0 opacity-[0.09]"
		style="background-image: repeating-linear-gradient(115deg, transparent 0 14px, #d4af37 14px 15px);"
		aria-hidden="true"
	></div>

	<!-- gold halo -->
	<div
		class="absolute inset-x-8 bottom-0 h-24 rounded-[50%] bg-gold/12 blur-2xl"
		aria-hidden="true"
	></div>

	<svg
		viewBox="0 0 120 120"
		class="relative h-3/4 w-auto text-gold/85"
		style="transform: rotate({tilt}deg)"
		fill="none"
		stroke="currentColor"
		stroke-width="1.6"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{#if shape === 'tin'}
			<ellipse cx="60" cy="42" rx="34" ry="11" />
			<path d="M26 42v26a34 11 0 0 0 68 0V42" />
			<ellipse cx="60" cy="68" rx="34" ry="11" opacity="0.35" />
			<circle cx="60" cy="42" r="17" opacity="0.5" />
			<circle cx="60" cy="42" r="9" opacity="0.35" />
			<path d="M26 88h68" opacity="0.25" />
		{:else}
			<path d="M52 18h16v12l10 10v56a6 6 0 0 1-6 6H48a6 6 0 0 1-6-6V40l10-10z" />
			<path d="M52 18h16" />
			<path d="M42 52h36" opacity="0.4" />
			<path d="M50 62h20M50 70h20M50 78h13" opacity="0.3" />
			<path d="M56 8h8v10h-8z" opacity="0.6" />
		{/if}
	</svg>

	<span
		class="display absolute top-3 left-3 text-[0.7rem] tracking-[0.2em] text-zinc-600 uppercase"
	>
		{category}
	</span>
</div>
