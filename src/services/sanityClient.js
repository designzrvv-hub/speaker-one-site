const DEFAULT_API_VERSION = '2026-07-15';
const DEFAULT_TIMEOUT_MS = 12000;

const PROJECT_ID_PATTERN = /^[a-z0-9]+$/i;
const DATASET_PATTERN = /^[a-z0-9_-]+$/i;
const API_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().toLowerCase() === 'true';
}

function normalizeEnvironment(environment) {
  return {
    projectId: String(environment?.VITE_SANITY_PROJECT_ID ?? '').trim(),
    dataset: String(environment?.VITE_SANITY_DATASET ?? 'production').trim(),
    apiVersion: String(environment?.VITE_SANITY_API_VERSION ?? DEFAULT_API_VERSION).trim(),
    useCdn: parseBoolean(environment?.VITE_SANITY_USE_CDN, true),
  };
}

export function getPublicSanityConfig(environment = import.meta.env) {
  const config = normalizeEnvironment(environment);
  const errors = [];

  if (!config.projectId) {
    errors.push('Не задан VITE_SANITY_PROJECT_ID.');
  } else if (!PROJECT_ID_PATTERN.test(config.projectId)) {
    errors.push('VITE_SANITY_PROJECT_ID содержит недопустимые символы.');
  }

  if (!DATASET_PATTERN.test(config.dataset)) {
    errors.push('VITE_SANITY_DATASET содержит недопустимые символы.');
  }

  if (!API_VERSION_PATTERN.test(config.apiVersion)) {
    errors.push('VITE_SANITY_API_VERSION должен быть датой YYYY-MM-DD.');
  }

  return Object.freeze({
    ...config,
    configured: errors.length === 0,
    errors,
  });
}

export function createPublishedQueryUrl(query, params = {}, config = getPublicSanityConfig()) {
  if (!config.configured) return null;
  if (typeof query !== 'string' || !query.trim()) return null;

  const apiHost = config.useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
  const url = new URL(
    `https://${config.projectId}.${apiHost}/v${config.apiVersion}/data/query/${config.dataset}`,
  );

  url.searchParams.set('query', query);
  url.searchParams.set('perspective', 'published');
  url.searchParams.set('returnQuery', 'false');

  Object.entries(params).forEach(([key, value]) => {
    const normalizedKey = key.startsWith('$') ? key : `$${key}`;
    url.searchParams.set(normalizedKey, JSON.stringify(value));
  });

  return url;
}

function failure(code, message, status) {
  return {
    ok: false,
    data: null,
    error: Object.freeze({code, message, ...(status ? {status} : {})}),
  };
}

export async function fetchPublishedContent({
  query,
  params,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  config = getPublicSanityConfig(),
  fetchImpl = fetch,
}) {
  if (!config.configured) {
    return failure('unconfigured', config.errors.join(' '));
  }

  const url = createPublishedQueryUrl(query, params, config);
  if (!url) {
    return failure('invalid-query', 'Sanity query не может быть пустым.');
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(signal?.reason);
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1, timeoutMs));

  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, {once: true});

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });

    if (!response.ok) {
      return failure('http-error', `Sanity вернул HTTP ${response.status}.`, response.status);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return failure('invalid-response', 'Sanity вернул ответ в неизвестном формате.');
    }

    if (payload?.error) {
      return failure('query-error', 'Sanity не смог выполнить published-запрос.');
    }

    return {ok: true, data: payload?.result ?? null, error: null};
  } catch (error) {
    if (controller.signal.aborted) {
      return failure(
        timedOut ? 'timeout' : 'aborted',
        timedOut ? 'Sanity не ответил за отведённое время.' : 'Sanity-запрос отменён.',
      );
    }

    return failure('network-error', 'Не удалось подключиться к Sanity.');
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

// Этот модуль используется только build-time скриптом. В браузерном runtime нет
// Sanity-токена, write-доступа или сетевого запроса к Content Lake.
