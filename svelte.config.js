import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Plain Node server: `npm run build` then `node build`. Runs anywhere
		// Node runs, which is what a self-hosted barbershop box needs.
		adapter: adapter()
	}
};

export default config;
