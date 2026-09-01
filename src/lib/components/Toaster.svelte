<script>
	import { fly } from 'svelte/transition';
	import { toasts, dismissToast } from '$lib/stores/toast.svelte.js';
	import Icon from './Icon.svelte';

	/** @param {string} kind */
	function accent(kind) {
		if (kind === 'error') return 'border-flash text-flash';
		if (kind === 'info') return 'border-zinc-700 text-zinc-300';
		return 'border-gold text-gold';
	}
</script>

<!--
	Bottom-anchored on phones (thumb reach), top-right on desktop.
	`pointer-events-none` on the stack so it never blocks the page underneath.
-->
<div
	class="pointer-events-none fixed inset-x-3 bottom-3 z-100 flex flex-col-reverse gap-2 sm:inset-x-auto sm:top-20 sm:right-5 sm:bottom-auto sm:w-90 sm:flex-col"
	role="region"
	aria-live="polite"
	aria-label="Notifications"
>
	{#each toasts.items as toast (toast.id)}
		<div
			transition:fly={{ y: 16, duration: 260 }}
			class="pointer-events-auto flex items-start gap-3 border bg-ink/95 px-4 py-3.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur {accent(
				toast.kind
			)}"
		>
			<span class="mt-0.5 shrink-0">
				<Icon name={toast.kind === 'error' ? 'close' : 'check'} size="16" stroke={2} />
			</span>

			<div class="min-w-0 flex-1">
				<p class="display text-[0.7rem] leading-tight">{toast.title}</p>
				{#if toast.body}
					<p class="mt-1 text-[0.8rem] leading-snug text-zinc-400">{toast.body}</p>
				{/if}
			</div>

			<button
				type="button"
				class="-mt-1 -mr-1 shrink-0 p-1 text-zinc-600 transition-colors hover:text-zinc-200"
				onclick={() => dismissToast(toast.id)}
				aria-label="Dismiss notification"
			>
				<Icon name="close" size="14" stroke={2} />
			</button>
		</div>
	{/each}
</div>
