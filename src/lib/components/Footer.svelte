<script>
	import Icon from './Icon.svelte';
	import Ornament from './Ornament.svelte';

	const year = new Date().getFullYear();
</script>

<footer id="contact" class="mt-24 border-t border-zinc-800 bg-black/40">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
		<Ornament icon="crown" class="mb-10" />

		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
			<div class="sm:col-span-2 lg:col-span-1">
				<p class="gothic foil text-3xl">Chicano</p>
				<p class="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
					Straight razors, firm-hold pomade and no appointments missed. Walk in a man, walk out a
					legend.
				</p>
			</div>

			<div>
				<p class="display mb-4 text-[0.6rem] text-zinc-500">Hours</p>
				<ul class="space-y-1.5 text-sm text-zinc-400">
					<li class="flex justify-between gap-4">
						<span>Mon — Fri</span><span class="tabular-nums text-zinc-200">10:00 — 21:00</span>
					</li>
					<li class="flex justify-between gap-4">
						<span>Sat — Sun</span><span class="tabular-nums text-zinc-200">11:00 — 20:00</span>
					</li>
				</ul>
			</div>

			<div>
				<p class="display mb-4 text-[0.6rem] text-zinc-500">Find us</p>
				<ul class="space-y-3 text-sm text-zinc-400">
					<li class="flex items-start gap-2.5">
						<span class="mt-0.5 text-gold/70"><Icon name="pin" size="15" /></span>
						<span>14 Whitechapel Row<br />East Side, Studio 3</span>
					</li>
					<li class="flex items-center gap-2.5">
						<span class="text-gold/70"><Icon name="phone" size="15" /></span>
						<a href="tel:+70000000000" class="transition-colors hover:text-gold">
							+7 000 000-00-00
						</a>
					</li>
				</ul>
			</div>

			<div>
				<p class="display mb-4 text-[0.6rem] text-zinc-500">Shop</p>
				<ul class="space-y-2 text-sm text-zinc-400">
					<li><a href="/booking" class="transition-colors hover:text-gold">Book a chair</a></li>
					<li><a href="/shop" class="transition-colors hover:text-gold">Grooming goods</a></li>
					<li><a href="/crew" class="transition-colors hover:text-gold">The crew</a></li>
					<li><a href="/account" class="transition-colors hover:text-gold">My appointments</a></li>
				</ul>
			</div>
		</div>

		<div
			class="mt-12 flex flex-col gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between"
		>
			<p>© {year} Chicano Barbershop — prototype build.</p>
			<p class="display text-[0.55rem]">Sharp lines · Cold steel · Warm towels</p>
		</div>
	</div>
</footer>
