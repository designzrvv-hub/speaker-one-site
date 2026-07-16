import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleLeadHealthRequest,
  handleLeadRequest,
  handleLeadTestRequest,
} from '../server/leadEndpoint.mjs';

const NOW = Date.parse('2026-07-16T10:00:00.000Z');
const environment = {
  TELEGRAM_BOT_TOKEN: 'test-token-not-real',
  TELEGRAM_CHAT_ID: '-1001234567890',
  TELEGRAM_THREAD_ID: '42',
  LEAD_WEBHOOK_SECRET: 'test-secret-not-real',
  LEAD_ALLOWED_ORIGINS: 'https://speaker-one.ru,http://localhost:5173',
  LEAD_STATUS_ALLOWED_ORIGINS: 'http://localhost:3333',
  LEAD_TIMEZONE: 'Asia/Yekaterinburg',
};
const validPayload = {
  name: 'Андрей',
  contact: '@speaker_one',
  message: 'Хочу увереннее выступать на рабочих встречах.',
  consent: true,
  website: '',
  formStartedAt: NOW - 5_000,
  utm: {utm_source: 'telegram', ignored: 'secret'},
};

function request(payload = validPayload, options = {}) {
  return new Request(options.url || 'https://api.example/api/leads', {
    method: options.method || 'POST',
    headers: {
      Origin: options.origin || 'https://speaker-one.ru',
      'Content-Type': options.contentType || 'application/json',
      ...(options.headers || {}),
    },
    body: ['GET', 'HEAD', 'OPTIONS'].includes(options.method) ? undefined : JSON.stringify(payload),
  });
}

function successFetch(assertion) {
  return async (url, init) => {
    assertion?.(url, init);
    return new Response(JSON.stringify({ok: true, result: {message_id: 123}}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  };
}

test('успех подтверждается только после успешного sendMessage Telegram', async () => {
  const response = await handleLeadRequest(request(), {
    environment,
    now: () => NOW,
    rateLimitStore: new Map(),
    fetchImpl: successFetch((url, init) => {
      assert.match(url, /^https:\/\/api\.telegram\.org\/bottest-token-not-real\/sendMessage$/);
      const body = JSON.parse(init.body);
      assert.equal(body.chat_id, environment.TELEGRAM_CHAT_ID);
      assert.equal(body.message_thread_id, 42);
      assert.match(body.text, /Новая заявка с сайта SPEAKER ONE/);
      assert.match(body.text, /utm_source: telegram/);
      assert.doesNotMatch(body.text, /ignored/);
      assert.equal(body.parse_mode, undefined);
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok: true});
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://speaker-one.ru');
});

test('ошибка Telegram не превращается в ложный успех', async () => {
  const response = await handleLeadRequest(request(), {
    environment,
    now: () => NOW,
    rateLimitStore: new Map(),
    fetchImpl: async () => new Response(JSON.stringify({ok: false}), {status: 400}),
  });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
});

test('не настроенный сервер возвращает unavailable без сетевого запроса', async () => {
  let called = false;
  const response = await handleLeadRequest(request(), {
    environment: {...environment, TELEGRAM_BOT_TOKEN: ''},
    now: () => NOW,
    rateLimitStore: new Map(),
    fetchImpl: async () => { called = true; },
  });
  assert.equal(response.status, 503);
  assert.equal(called, false);
});

test('CORS разрешает только конкретные origins', async () => {
  const denied = await handleLeadRequest(request(validPayload, {origin: 'https://attacker.example'}), {
    environment,
    now: () => NOW,
    rateLimitStore: new Map(),
  });
  assert.equal(denied.status, 403);

  const preflight = await handleLeadRequest(request(null, {method: 'OPTIONS'}), {environment});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://speaker-one.ru');
});

test('валидация отклоняет honeypot, слишком быструю и неверную заявку', async () => {
  const variants = [
    {...validPayload, website: 'spam'},
    {...validPayload, formStartedAt: NOW - 100},
    {...validPayload, name: 'A'},
    {...validPayload, consent: false},
  ];
  for (const payload of variants) {
    const response = await handleLeadRequest(request(payload), {
      environment,
      now: () => NOW,
      rateLimitStore: new Map(),
      fetchImpl: successFetch(),
    });
    assert.equal(response.status, 400);
  }
});

test('неподходящий метод и Content-Type отклоняются', async () => {
  const wrongMethod = await handleLeadRequest(request(null, {method: 'GET'}), {environment});
  assert.equal(wrongMethod.status, 405);
  const wrongType = await handleLeadRequest(request(validPayload, {contentType: 'text/plain'}), {environment});
  assert.equal(wrongType.status, 415);
});

test('повторные запросы ограничиваются rate limit', async () => {
  const store = new Map();
  for (let index = 0; index < 5; index += 1) {
    const response = await handleLeadRequest(request(), {
      environment,
      now: () => NOW + index,
      rateLimitStore: store,
      fetchImpl: successFetch(),
    });
    assert.equal(response.status, 200);
  }
  const limited = await handleLeadRequest(request(), {
    environment,
    now: () => NOW + 6,
    rateLimitStore: store,
    fetchImpl: successFetch(),
  });
  assert.equal(limited.status, 429);
});

test('health раскрывает только безопасный статус конфигурации', async () => {
  const response = await handleLeadHealthRequest(new Request('https://api.example/health', {
    headers: {Origin: 'http://localhost:3333'},
  }), {environment});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok: true, status: 'configured', threadConfigured: true});
});

test('серверная тестовая отправка требует отдельный секрет', async () => {
  const denied = await handleLeadTestRequest(new Request('https://api.example/test', {method: 'POST'}), {environment});
  assert.equal(denied.status, 401);
  const approved = await handleLeadTestRequest(new Request('https://api.example/test', {
    method: 'POST',
    headers: {'X-Lead-Webhook-Secret': environment.LEAD_WEBHOOK_SECRET},
  }), {environment, now: () => NOW, fetchImpl: successFetch()});
  assert.equal(approved.status, 200);
});
