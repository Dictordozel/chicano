<script module>
	/**
	 * Hand-drawn icon set for the shop. Everything is authored here as static
	 * markup — no icon library, so the line weight stays consistent with the
	 * engraved, tattoo-flash look.
	 * @type {Record<string, string>}
	 */
	const PATHS = {
		razor: `<path d="M3 17.5 13.5 7a3.5 3.5 0 1 1 5 5L8 22.5a2.5 2.5 0 0 1-3.5 0l-1-1a2.5 2.5 0 0 1 0-3.5Z"/><path d="M14.5 8.5 17 11"/><path d="M19.5 2.5 21 4"/><path d="M17 1.5 18 2.5"/>`,
		scissors: `<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>`,
		comb: `<path d="M3 4h18v5H3z"/><path d="M6 9v11M10 9v8M14 9v11M18 9v8"/>`,
		cart: `<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h2.5l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/>`,
		user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
		calendar: `<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 10h18M8 2v4M16 2v4"/>`,
		clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>`,
		check: `<path d="m4 12.5 5 5L20 6.5"/>`,
		close: `<path d="M6 6 18 18M18 6 6 18"/>`,
		chevron: `<path d="m9 5 7 7-7 7"/>`,
		arrow: `<path d="M4 12h15M13 6l6 6-6 6"/>`,
		plus: `<path d="M12 5v14M5 12h14"/>`,
		minus: `<path d="M5 12h14"/>`,
		trash: `<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>`,
		external: `<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>`,
		pin: `<path d="M12 22s7-6.2 7-11.5A7 7 0 0 0 5 10.5C5 15.8 12 22 12 22Z"/><circle cx="12" cy="10.5" r="2.5"/>`,
		phone: `<path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 5.5 5.5L15.5 12l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.2 2 2 0 0 1 5 3Z"/>`,
		// A stylised rose — lowrider / Chicano tattoo flash
		rose: `<path d="M12 3c3 0 5 2 5 4.5S15 12 12 12 7 10 7 7.5 9 3 12 3Z"/><path d="M9.5 7.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5"/><path d="M12 12v9"/><path d="M12 15.5c-1.5-2-3.5-2.5-5-2 .3 2.2 2 3.5 5 3.5Z"/><path d="M12 18c1.5-2 3.5-2.5 5-2-.3 2.2-2 3.5-5 3.5Z"/>`,
		crown: `<path d="M3 18h18"/><path d="m3 8 4 4 5-8 5 8 4-4v7H3V8Z"/>`,
		star: `<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z"/>`,
		bag: `<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/>`,
		logout: `<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
		flash: `<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>`
	};
</script>

<script>
	/**
	 * @type {{ name: keyof typeof PATHS | string, size?: number | string, class?: string, stroke?: number, fill?: boolean }}
	 */
	let { name, size = 20, class: className = '', stroke = 1.5, fill = false } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill={fill ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	aria-hidden="true"
	focusable="false"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static, authored above -->
	{@html PATHS[name] ?? ''}
</svg>
