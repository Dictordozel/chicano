import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guard.js';
import { listBarbers, today, db } from '$lib/server/db.js';
import { providerStatus } from '$lib/server/sms.js';
import {
	TEMPLATES,
	LEAD_TIMES,
	previewBroadcast,
	unresolvablePlaceholders,
	sendBroadcast,
	listOutbox,
	outboxStats,
	resyncAllUpcoming,
	tick
} from '$lib/server/notifications.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SCOPES = ['today', 'date', 'range', 'upcoming', 'all'];

/** Reads the audience filter out of the URL, so a preview is shareable. */
function readFilter(params) {
	const scope = SCOPES.includes(params.get('scope') ?? '') ? params.get('scope') : 'today';
	const date = DATE_RE.test(params.get('date') ?? '') ? params.get('date') : today();
	const until = DATE_RE.test(params.get('until') ?? '') ? params.get('until') : date;
	const barberId = Number(params.get('barberId')) || 0;
	return { scope, date, until, barberId };
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals, url);

	const filter = readFilter(url.searchParams);
	// 'all' has no booking behind it, so it gets a greeting rather than an outage notice.
	const fallback = filter.scope === 'all' ? TEMPLATES.broadcast_all : TEMPLATES.broadcast_default;
	const template = url.searchParams.get('template') || fallback;
	const preview = previewBroadcast(filter, template);

	return {
		provider: providerStatus(),
		stats: outboxStats(),
		outbox: listOutbox({
			status: url.searchParams.get('status') ?? 'all',
			kind: url.searchParams.get('kind') ?? 'all',
			limit: 60
		}),
		barbers: listBarbers(),
		filter,
		template,
		statusFilter: url.searchParams.get('status') ?? 'all',
		kindFilter: url.searchParams.get('kind') ?? 'all',
		preview: {
			total: preview.total,
			reachable: preview.reachable.length,
			unreachable: preview.unreachable.map((r) => ({
				name: r.client_name,
				email: r.client_email,
				date: r.date,
				time: r.time
			})),
			sample: preview.reachable.slice(0, 3).map((r) => ({ name: r.client_name, phone: r.phone, body: r.body }))
		},
		leadTimes: {
			day: LEAD_TIMES.reminder_day / 3_600_000,
			hour: LEAD_TIMES.reminder_hour / 3_600_000
		}
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	broadcast: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();

		const filter = readFilter(new URLSearchParams(/** @type {any} */ (Object.fromEntries(form))));
		const template = String(form.get('template') ?? '').trim();

		if (template.length < 10) {
			return fail(400, { errors: { template: 'Write the message first.' }, template });
		}

		// "Everyone" has no booking attached, so {date} and friends would go out
		// as literal braces. Refuse rather than text that to the whole list.
		if (filter.scope === 'all') {
			const stray = unresolvablePlaceholders(template);
			if (stray.length) {
				return fail(400, {
					errors: {
						template: `Sending to everyone has no booking behind it, so ${stray
							.map((p) => `{${p}}`)
							.join(', ')} would arrive as-is. Remove ${stray.length === 1 ? 'it' : 'them'} or narrow the audience.`
					},
					template
				});
			}
		}

		const preview = previewBroadcast(filter, template);
		if (preview.reachable.length === 0) {
			return fail(400, {
				errors: { template: 'Nobody in this selection has a phone number to text.' },
				template
			});
		}

		// Typing the recipient count is the confirmation step — a force-majeure
		// blast is not something to fire off with one stray click.
		if (Number(form.get('confirm')) !== preview.reachable.length) {
			return fail(400, {
				errors: {
					confirm: `Type ${preview.reachable.length} to confirm sending to ${preview.reachable.length} client${preview.reachable.length === 1 ? '' : 's'}.`
				},
				template
			});
		}

		const result = await sendBroadcast(filter, template);
		return { broadcast: result };
	},

	resync: async ({ locals, url }) => {
		requireAdmin(locals, url);
		return { resync: resyncAllUpcoming() };
	},

	drain: async ({ locals, url }) => {
		requireAdmin(locals, url);
		return { drain: await tick() };
	},

	retry: async ({ request, locals, url }) => {
		requireAdmin(locals, url);
		const form = await request.formData();
		const id = Number(form.get('id'));

		const changed = db
			.prepare(
				"UPDATE notifications SET status = 'pending', attempts = 0, error = NULL, send_at = ? WHERE id = ? AND status IN ('failed','expired')"
			)
			.run(Date.now(), id).changes;
		if (!changed) return fail(404, { message: 'Nothing to retry.' });

		const result = await tick();
		return { retry: result };
	}
};
