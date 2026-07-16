const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const BODY_LIMIT_BYTES = 20_000;
const TELEGRAM_TIMEOUT_MS = 12_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MINIMUM_FILL_TIME_MS = 2_000;
const MAXIMUM_FORM_AGE_MS = 24 * 60 * 60 * 1000;

const FIELD_LIMITS = Object.freeze({
  name: {min: 2, max: 80},
  contact: {min: 3, max: 120},
  message: {min: 5, max: 1000},
});

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const inMemoryRateLimitStore = new Map();

function json(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': JSON_CONTENT_TYPE,
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function parseAllowedOrigins(value) {
  return String(value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function corsHeaders(request, environment, {statusEndpoint = false} = {}) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  const value = statusEndpoint
    ? environment.LEAD_STATUS_ALLOWED_ORIGINS || environment.LEAD_ALLOWED_ORIGINS
    : environment.LEAD_ALLOWED_ORIGINS;
  const allowedOrigins = parseAllowedOrigins(value);
  if (!allowedOrigins.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };
}

function cleanText(value) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
    : '';
}

function validateText(value, limits) {
  const text = cleanText(value);
  return text.length >= limits.min && text.length <= limits.max ? text : null;
}

function normalizeUtm(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    UTM_KEYS
      .map((key) => [key, cleanText(value[key]).slice(0, 120)])
      .filter(([, item]) => Boolean(item)),
  );
}

function getClientAddress(request) {
  return cleanText(
    request.headers.get('cf-connecting-ip')
      || request.headers.get('x-real-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]
      || 'unknown',
  ).slice(0, 128);
}

function isRateLimited(key, now, store = inMemoryRateLimitStore) {
  const recent = (store.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    store.set(key, recent);
    return true;
  }
  recent.push(now);
  store.set(key, recent);
  return false;
}

function formatDate(date, environment) {
  const timeZone = cleanText(environment.LEAD_TIMEZONE) || 'Asia/Yekaterinburg';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'long',
      timeStyle: 'long',
      timeZone,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function formatTelegramMessage(lead, environment, date) {
  const utmEntries = Object.entries(lead.utm);
  const lines = [
    'Новая заявка с сайта SPEAKER ONE',
    '',
    'Имя:',
    lead.name,
    '',
    'Контакт:',
    lead.contact,
    '',
    'Что хочет улучшить:',
    lead.message,
    '',
    'Источник:',
    'Сайт SPEAKER ONE',
    '',
    'Дата и время:',
    formatDate(date, environment),
  ];
  if (utmEntries.length > 0) {
    lines.push('', 'UTM:');
    utmEntries.forEach(([key, value]) => lines.push(`${key}: ${value}`));
  }
  return lines.join('\n');
}

function normalizeEnvironment(environment) {
  return {
    TELEGRAM_BOT_TOKEN: cleanText(environment.TELEGRAM_BOT_TOKEN),
    TELEGRAM_CHAT_ID: cleanText(environment.TELEGRAM_CHAT_ID),
    TELEGRAM_THREAD_ID: cleanText(environment.TELEGRAM_THREAD_ID),
    LEAD_WEBHOOK_SECRET: cleanText(environment.LEAD_WEBHOOK_SECRET),
    LEAD_ALLOWED_ORIGINS: cleanText(environment.LEAD_ALLOWED_ORIGINS),
    LEAD_STATUS_ALLOWED_ORIGINS: cleanText(environment.LEAD_STATUS_ALLOWED_ORIGINS),
    LEAD_TIMEZONE: cleanText(environment.LEAD_TIMEZONE),
  };
}

function isConfigured(environment) {
  return Boolean(environment.TELEGRAM_BOT_TOKEN && environment.TELEGRAM_CHAT_ID);
}

async function sendTelegramMessage(lead, environment, fetchImpl, now) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  const requestBody = {
    chat_id: environment.TELEGRAM_CHAT_ID,
    text: formatTelegramMessage(lead, environment, new Date(now)),
    disable_web_page_preview: true,
  };
  if (/^-?\d+$/.test(environment.TELEGRAM_THREAD_ID)) {
    requestBody.message_thread_id = Number(environment.TELEGRAM_THREAD_ID);
  }

  try {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${environment.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
    const payload = await response.json().catch(() => null);
    return response.ok && payload?.ok === true && Number.isFinite(payload?.result?.message_id);
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readRequestBody(request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > BODY_LIMIT_BYTES) return {error: 'too-large'};
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > BODY_LIMIT_BYTES) return {error: 'too-large'};
  try {
    return {value: JSON.parse(raw)};
  } catch {
    return {error: 'invalid-json'};
  }
}

function normalizeLead(payload, now) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const name = validateText(payload.name, FIELD_LIMITS.name);
  const contact = validateText(payload.contact, FIELD_LIMITS.contact);
  const message = validateText(payload.message, FIELD_LIMITS.message);
  const website = cleanText(payload.website);
  const startedAt = Number(payload.formStartedAt);
  const elapsed = now - startedAt;
  if (
    !name || !contact || !message || payload.consent !== true || website
    || !Number.isFinite(startedAt) || elapsed < MINIMUM_FILL_TIME_MS || elapsed > MAXIMUM_FORM_AGE_MS
  ) return null;
  return {name, contact, message, utm: normalizeUtm(payload.utm)};
}

export async function handleLeadRequest(request, options = {}) {
  const environment = normalizeEnvironment(options.environment ?? process.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now?.() ?? Date.now();
  const cors = corsHeaders(request, environment);
  if (cors === null) return json(403, {ok: false, message: 'Источник запроса не разрешён.'});

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      },
    });
  }
  if (request.method !== 'POST') return json(405, {ok: false, message: 'Метод не поддерживается.'}, {...cors, Allow: 'POST, OPTIONS'});
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json(415, {ok: false, message: 'Ожидается JSON.'}, cors);
  }
  if (!isConfigured(environment)) {
    return json(503, {ok: false, message: 'Онлайн-отправка пока не настроена.'}, cors);
  }
  if (isRateLimited(getClientAddress(request), now, options.rateLimitStore)) {
    return json(429, {ok: false, message: 'Слишком много запросов. Попробуйте позже.'}, {...cors, 'Retry-After': '600'});
  }

  const body = await readRequestBody(request);
  if (body.error) return json(400, {ok: false, message: 'Проверьте данные формы.'}, cors);
  const lead = normalizeLead(body.value, now);
  if (!lead) return json(400, {ok: false, message: 'Проверьте данные формы.'}, cors);

  const delivered = await sendTelegramMessage(lead, environment, fetchImpl, now);
  return delivered
    ? json(200, {ok: true}, cors)
    : json(502, {ok: false, message: 'Не удалось передать заявку. Попробуйте позже.'}, cors);
}

export async function handleLeadHealthRequest(request, options = {}) {
  const environment = normalizeEnvironment(options.environment ?? process.env);
  const cors = corsHeaders(request, environment, {statusEndpoint: true});
  if (cors === null) return json(403, {ok: false, status: 'forbidden'});
  if (request.method !== 'GET') return json(405, {ok: false, status: 'method-not-allowed'}, {...cors, Allow: 'GET'});
  const configured = isConfigured(environment);
  return json(configured ? 200 : 503, {
    ok: configured,
    status: configured ? 'configured' : 'unconfigured',
    threadConfigured: Boolean(environment.TELEGRAM_THREAD_ID),
  }, cors);
}

export async function handleLeadTestRequest(request, options = {}) {
  const environment = normalizeEnvironment(options.environment ?? process.env);
  if (!environment.LEAD_WEBHOOK_SECRET) return json(503, {ok: false, message: 'Тестовая проверка не настроена.'});
  if (request.method !== 'POST') return json(405, {ok: false, message: 'Метод не поддерживается.'}, {Allow: 'POST'});
  if (request.headers.get('x-lead-webhook-secret') !== environment.LEAD_WEBHOOK_SECRET) {
    return json(401, {ok: false, message: 'Доступ запрещён.'});
  }
  if (!isConfigured(environment)) return json(503, {ok: false, message: 'Telegram не настроен.'});
  const now = options.now?.() ?? Date.now();
  const delivered = await sendTelegramMessage({
    name: 'Безопасная тестовая проверка',
    contact: 'Серверная функция',
    message: 'Тестовое сообщение. Персональные данные не передавались.',
    utm: {},
  }, environment, options.fetchImpl ?? fetch, now);
  return delivered ? json(200, {ok: true}) : json(502, {ok: false, message: 'Telegram не подтвердил отправку.'});
}

export const leadEndpointLimits = Object.freeze({
  fields: FIELD_LIMITS,
  bodyBytes: BODY_LIMIT_BYTES,
  timeoutMs: TELEGRAM_TIMEOUT_MS,
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
});
