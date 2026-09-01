<script>
	import Icon from './Icon.svelte';

	/** @type {{ icon?: string, class?: string }} */
	let { icon = 'rose', class: className = '' } = $props();
</script>

<div class="flex items-center gap-4 {className}" aria-hidden="true">
	<div class="rule-gold h-px flex-1"></div>
	<Icon name={icon} size="18" class="text-gold/70" stroke={1.2} />
	<div class="rule-gold h-px flex-1"></div>
</div>
