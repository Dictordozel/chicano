/**
 * SMS delivery. One provider interface, two drivers:
 *
 *   log    — default. Nothing leaves the building; every message is recorded in
 *            the outbox and printed. Lets the whole schedule be exercised for
 *            real without a paid gateway.
 *   sms.ru — live sending. Set SMS_PROVIDER=smsru and SMS_API_KEY.
 *
 * Adding another gateway means one more branch in `deliver` — the rest of the
 * app only ever calls `sendSms`.
 */
import { env } from '$env/dynamic/private';

/** @returns {'log' | 'smsru'} */
export function providerName() {
	return env.SMS_PROVIDER === 'smsru' ? 'smsru' : 'log';
}

export function providerIsLive() {
	return providerName() !== 'log';
}

/** Human-readable state for the admin banner. */
export function providerStatus() {
	const name = providerName();
	if (name === 'smsru') {
		return env.SMS_API_KEY
			? { name, live: true, ready: true, detail: 'sms.ru — messages are really sent' }
			: { name, live: true, ready: false, detail: 'sms.ru selected but SMS_API_KEY is missing' };
	}
	return {
		name,
		live: false,
		ready: true,
		detail: 'Simulated — messages are queued and recorded, nothing is sent'
	};
}

/**
 * Normalises a Russian number to E.164 (+7XXXXXXXXXX).
 * Returns null when there is nothing usable to send to.
 *
 * @param {string | null | undefined} raw
 */
export function normalizePhone(raw) {
	if (!raw) return null;

	let digits = String(raw).replace(/\D/g, '');
	if (!digits) return null;

	// 8XXXXXXXXXX and 7XXXXXXXXXX are the same number written two ways.
	if (digits.length === 11 && (digits[0] === '8' || digits[0] === '7')) {
		digits = '7' + digits.slice(1);
	} else if (digits.length === 10) {
		digits = '7' + digits;
	} else {
		return null;
	}

	return '+' + digits;
}

/**
 * Fills {name}, {date}, {time}, {barber}, {service} in a template.
 * Unknown placeholders are left alone rather than silently blanked.
 *
 * @param {string} template
 * @param {Record<string, string | number | null | undefined>} values
 */
export function renderTemplate(template, values) {
	return template.replace(/\{(\w+)\}/g, (whole, key) => {
		const v = values[key];
		return v === undefined || v === null || v === '' ? whole : String(v);
	});
}

/**
 * Sends one message. Never throws — a delivery failure is a result, not an
 * exception, because the caller records it in the outbox either way.
 *
 * @param {string} phone E.164
 * @param {string} text
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
export async function sendSms(phone, text) {
	if (providerName() === 'smsru') return deliverSmsRu(phone, text);

	// Simulated driver.
	console.log(`[sms:log] → ${phone}  ${JSON.stringify(text)}`);
	return { ok: true, id: `log-${Date.now().toString(36)}` };
}

/**
 * @param {string} phone
 * @param {string} text
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
async function deliverSmsRu(phone, text) {
	const apiKey = env.SMS_API_KEY;
	if (!apiKey) return { ok: false, error: 'SMS_API_KEY is not set' };

	const body = new URLSearchParams({
		api_id: apiKey,
		to: phone.replace('+', ''),
		msg: text,
		json: '1'
	});
	if (env.SMS_FROM) body.set('from', env.SMS_FROM);

	try {
		const res = await fetch('https://sms.ru/sms/send', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body,
			signal: AbortSignal.timeout(15_000)
		});

		if (!res.ok) return { ok: false, error: `gateway HTTP ${res.status}` };

		const data = /** @type {any} */ (await res.json());
		if (data.status !== 'OK') {
			return { ok: false, error: data.status_text || `gateway status ${data.status_code}` };
		}

		const entry = data.sms?.[phone.replace('+', '')];
		if (entry && entry.status !== 'OK') {
			return { ok: false, error: entry.status_text || `sms status ${entry.status_code}` };
		}

		return { ok: true, id: entry?.sms_id ? String(entry.sms_id) : undefined };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : 'network error' };
	}
}
