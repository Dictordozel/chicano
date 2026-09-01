<script>
	/**
	 * One labelled form control — text, number, textarea or select. The admin
	 * forms are mostly this shape, so it lives in one place.
	 *
	 * @type {{
	 *   name: string,
	 *   label: string,
	 *   type?: 'text' | 'number' | 'url' | 'email' | 'tel' | 'date' | 'textarea' | 'select',
	 *   value?: string | number | null,
	 *   options?: { value: string | number, label: string }[],
	 *   placeholder?: string,
	 *   hint?: string,
	 *   error?: string,
	 *   required?: boolean,
	 *   rows?: number,
	 *   min?: number,
	 *   max?: number,
	 *   step?: number,
	 *   class?: string
	 * }}
	 */
	let {
		name,
		label,
		type = 'text',
		value = '',
		options = [],
		placeholder = '',
		hint = '',
		error = '',
		required = false,
		rows = 3,
		min,
		max,
		step,
		class: className = ''
	} = $props();

	// `name` identifies the control and never changes for a given instance.
	let id = $derived(`f-${name}`);
</script>

<div class={className}>
	<label class="label" for={id}>
		{label}
		{#if !required}<span class="text-zinc-700">— optional</span>{/if}
	</label>

	{#if type === 'textarea'}
		<textarea
			{id}
			{name}
			{rows}
			{placeholder}
			{required}
			class="field resize-none"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={hint ? `${id}-hint` : undefined}>{value ?? ''}</textarea
		>
	{:else if type === 'select'}
		<select
			{id}
			{name}
			{required}
			class="field"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={hint ? `${id}-hint` : undefined}
		>
			{#each options as option (option.value)}
				<option value={option.value} selected={String(option.value) === String(value)}>
					{option.label}
				</option>
			{/each}
		</select>
	{:else}
		<input
			{id}
			{name}
			{type}
			{placeholder}
			{required}
			{min}
			{max}
			{step}
			value={value ?? ''}
			class="field"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={hint ? `${id}-hint` : undefined}
		/>
	{/if}

	{#if error}
		<p class="mt-1.5 text-xs text-flash">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="mt-1.5 text-[0.7rem] text-zinc-600">{hint}</p>
	{/if}
</div>
