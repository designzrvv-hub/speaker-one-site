const LEAD_TIMEOUT_MS = 12000;
const LEAD_SOURCE = 'speaker-one-website';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function getUtmParameters() {
  if (typeof window === 'undefined') return {};
  const search = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    UTM_KEYS.map((key) => [key, search.get(key)?.trim() ?? '']).filter(([, value]) => value),
  );
}

async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const contentLength = response.headers.get('content-length');

  if (!contentType.includes('application/json') || contentLength === '0') {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function submitLead(payload) {
  const endpoint = String(import.meta.env.VITE_LEAD_ENDPOINT ?? '').trim();

  if (!endpoint) {
    return { ok: false, status: 'unavailable', reason: 'missing-endpoint' };
  }

  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, LEAD_TIMEOUT_MS);

  const requestBody = {
    name: String(payload.name ?? '').trim(),
    contact: String(payload.contact ?? '').trim(),
    message: String(payload.message ?? '').trim(),
    consent: payload.consent === true,
    source: LEAD_SOURCE,
    website: String(payload.website ?? '').trim(),
    formStartedAt: Number(payload.formStartedAt),
    utm: getUtmParameters(),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const responseBody = await readJsonResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        status: 'error',
        reason: 'server-rejected',
        httpStatus: response.status,
      };
    }

    if (responseBody?.ok !== true) {
      return { ok: false, status: 'error', reason: 'unconfirmed-response' };
    }

    return { ok: true, status: 'success' };
  } catch {
    return {
      ok: false,
      status: 'error',
      reason: didTimeout ? 'timeout' : 'network',
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
