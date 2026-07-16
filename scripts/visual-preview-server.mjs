import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {existsSync, statSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient, validateApiPerspective} from '@sanity/client';
import {validatePreviewUrl} from '@sanity/preview-url-secret';
import {perspectiveCookieName} from '@sanity/preview-url-secret/constants';
import {withoutSecretSearchParams} from '@sanity/preview-url-secret/without-secret-search-params';
import {createServer as createViteServer, loadEnv} from 'vite';
import {SANITY_SITE_CONTENT_QUERY} from '../src/services/contentQuery.js';

const ROOT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIRECTORY = resolve(ROOT_DIRECTORY, 'dist');
const PREVIEW_SESSION_COOKIE = 'speaker-one-preview-session';
const PREVIEW_TTL_SECONDS = 60 * 60;
const PREVIEW_TIMEOUT_MS = 12_000;
const LIVE_KEEPALIVE_MS = 20_000;
const IS_PRODUCTION = process.argv.includes('--production');
const MODE = IS_PRODUCTION ? 'production' : 'development';
const fileEnvironment = loadEnv(MODE, ROOT_DIRECTORY, '');
const environment = {...fileEnvironment, ...process.env};

const projectId = String(environment.VITE_SANITY_PROJECT_ID ?? '').trim();
const dataset = String(environment.VITE_SANITY_DATASET ?? 'production').trim();
const apiVersion = String(environment.VITE_SANITY_API_VERSION ?? '2026-07-15').trim();
const readToken = String(environment.SANITY_API_READ_TOKEN ?? '').trim();
const studioUrl = String(environment.SANITY_STUDIO_URL ?? 'http://localhost:3333').trim();
const previewPort = Number.parseInt(environment.SANITY_PREVIEW_PORT ?? '5173', 10);
const configuredSessionSecret = String(environment.SANITY_PREVIEW_SESSION_SECRET ?? '').trim();
const sessionSecret = configuredSessionSecret || randomBytes(32).toString('base64url');

const configurationErrors = [];
if (!/^[a-z0-9]+$/i.test(projectId)) configurationErrors.push('VITE_SANITY_PROJECT_ID');
if (!/^[a-z0-9_-]+$/i.test(dataset)) configurationErrors.push('VITE_SANITY_DATASET');
if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) configurationErrors.push('VITE_SANITY_API_VERSION');
if (!readToken) configurationErrors.push('SANITY_API_READ_TOKEN');
if (!Number.isInteger(previewPort) || previewPort < 1 || previewPort > 65535) {
  configurationErrors.push('SANITY_PREVIEW_PORT');
}

let normalizedStudioUrl = '';
try {
  const parsedStudioUrl = new URL(studioUrl);
  if (!['http:', 'https:'].includes(parsedStudioUrl.protocol)) throw new Error('invalid protocol');
  normalizedStudioUrl = parsedStudioUrl.toString().replace(/\/$/, '');
} catch {
  configurationErrors.push('SANITY_STUDIO_URL');
}

if (IS_PRODUCTION && configuredSessionSecret.length < 32) {
  configurationErrors.push('SANITY_PREVIEW_SESSION_SECRET (минимум 32 символа)');
}

const previewConfigured = configurationErrors.length === 0;
const baseClient = /^[a-z0-9]+$/i.test(projectId) && /^[a-z0-9_-]+$/i.test(dataset)
  ? createClient({projectId, dataset, apiVersion, useCdn: false, perspective: 'published'})
  : null;

const STEGA_EXCLUDED_FIELDS = new Set([
  'internalKey',
  'network',
  'inn',
  'ogrnip',
  'primaryCtaAction',
  'consultationAction',
  'ctaTarget',
  'actionType',
  'section',
  'entityType',
]);

function stegaFilter(properties) {
  const fieldName = properties.sourcePath.at(-1);
  if (typeof fieldName === 'string' && STEGA_EXCLUDED_FIELDS.has(fieldName)) return false;
  return properties.filterDefault(properties);
}

function getPreviewClient(perspective = 'drafts') {
  if (!previewConfigured || !baseClient) return null;
  return baseClient.withConfig({
    token: readToken,
    perspective,
    useCdn: false,
    stega: {
      enabled: true,
      studioUrl: normalizedStudioUrl,
      filter: stegaFilter,
    },
  });
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie ?? '')
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=');
        if (separator < 0) return [entry, ''];
        return [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
  );
}

function signSessionValue(value) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function createPreviewSession() {
  const value = `${Date.now()}.${randomBytes(24).toString('base64url')}`;
  return `${value}.${signSessionValue(value)}`;
}

function isValidPreviewSession(request) {
  const session = parseCookies(request)[PREVIEW_SESSION_COOKIE];
  if (!session) return false;

  const parts = session.split('.');
  if (parts.length !== 3) return false;
  const [issuedAt, randomValue, receivedSignature] = parts;
  const issuedAtNumber = Number(issuedAt);
  if (!Number.isFinite(issuedAtNumber)) return false;
  if (issuedAtNumber > Date.now() + 60_000) return false;
  if (Date.now() - issuedAtNumber > PREVIEW_TTL_SECONDS * 1000) return false;

  const value = `${issuedAt}.${randomValue}`;
  const expectedSignature = signSessionValue(value);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);
  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function serializePerspective(perspective) {
  return Array.isArray(perspective) ? perspective.join(',') : perspective;
}

function normalizePerspective(value) {
  const input = Array.isArray(value) ? value : String(value ?? 'drafts').split(',').filter(Boolean);
  const perspective = input.length === 1 ? input[0] : input;
  validateApiPerspective(perspective);
  return perspective === 'raw' ? 'drafts' : perspective;
}

function getPreviewPerspective(request) {
  const encodedValue = parseCookies(request)[perspectiveCookieName];
  if (!encodedValue) return 'drafts';
  try {
    return normalizePerspective(decodeURIComponent(encodedValue));
  } catch {
    return 'drafts';
  }
}

function cookie(name, value, maxAge = PREVIEW_TTL_SECONDS) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
}

function writeJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end(JSON.stringify(payload));
}

function writePreviewUnavailable(response) {
  writeJson(response, 503, {
    ok: false,
    message: 'Защищённый предпросмотр пока не настроен. Проверьте локальные переменные окружения.',
  });
}

const liveResponses = new Set();
let liveSubscription = null;

function writeLiveEvent(response, eventName, payload = {}) {
  response.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function stopLiveSubscriptionIfIdle() {
  if (liveResponses.size > 0 || !liveSubscription) return;
  liveSubscription.unsubscribe();
  liveSubscription = null;
}

function broadcastLiveEvent(eventName, payload = {}) {
  liveResponses.forEach((response) => {
    try {
      writeLiveEvent(response, eventName, payload);
    } catch {
      liveResponses.delete(response);
    }
  });
  stopLiveSubscriptionIfIdle();
}

function ensureLiveSubscription() {
  if (liveSubscription || !previewConfigured || !baseClient) return;
  const client = baseClient.withConfig({token: readToken, useCdn: false});
  liveSubscription = client.live.events({
    includeDrafts: true,
    tag: 'speaker-one-visual-preview',
  }).subscribe({
    next(event) {
      if (event.type === 'message' || event.type === 'restart') {
        broadcastLiveEvent('content', {type: event.type});
      }
      if (event.type === 'goaway') {
        broadcastLiveEvent('status', {type: 'reconnect'});
      }
    },
    error(error) {
      if (!IS_PRODUCTION) console.error('[Visual preview] Live Content API:', error?.message);
      broadcastLiveEvent('status', {type: 'error'});
      liveSubscription = null;
    },
  });
}

function openLivePreviewEvents(request, response) {
  if (!previewConfigured) return writePreviewUnavailable(response);
  if (!isValidPreviewSession(request)) {
    return writeJson(response, 401, {
      ok: false,
      message: 'Откройте предпросмотр через Sanity Studio.',
    });
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.write(': connected\n\n');
  liveResponses.add(response);
  ensureLiveSubscription();

  const keepaliveId = setInterval(() => {
    try {
      response.write(': keepalive\n\n');
    } catch {
      clearInterval(keepaliveId);
    }
  }, LIVE_KEEPALIVE_MS);

  request.once('close', () => {
    clearInterval(keepaliveId);
    liveResponses.delete(response);
    stopLiveSubscriptionIfIdle();
  });
}

async function enableDraftMode(request, response, requestUrl) {
  if (!previewConfigured || !baseClient) return writePreviewUnavailable(response);

  try {
    const validationClient = baseClient.withConfig({token: readToken, useCdn: false});
    const {isValid, redirectTo, studioPreviewPerspective} = await validatePreviewUrl(
      validationClient,
      requestUrl.toString(),
    );

    if (!isValid) return writeJson(response, 401, {ok: false, message: 'Ссылка предпросмотра недействительна.'});

    const perspective = normalizePerspective(studioPreviewPerspective || 'drafts');
    const cleanedRedirect = redirectTo
      ? withoutSecretSearchParams(new URL(redirectTo, requestUrl))
      : new URL('/', requestUrl);
    const safeLocation = cleanedRedirect.origin === requestUrl.origin
      ? `${cleanedRedirect.pathname}${cleanedRedirect.search}${cleanedRedirect.hash}`
      : '/';

    response.writeHead(307, {
      Location: safeLocation || '/',
      'Set-Cookie': [
        cookie(perspectiveCookieName, serializePerspective(perspective)),
        cookie(PREVIEW_SESSION_COOKIE, createPreviewSession()),
      ],
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    });
    response.end();
  } catch (error) {
    if (!IS_PRODUCTION) console.error('[Visual preview] Не удалось включить draft mode:', error?.message);
    writeJson(response, 401, {ok: false, message: 'Не удалось подтвердить доступ к предпросмотру.'});
  }
}

function disableDraftMode(response) {
  response.writeHead(307, {
    Location: '/',
    'Set-Cookie': [
      cookie(perspectiveCookieName, '', 0),
      cookie(PREVIEW_SESSION_COOKIE, '', 0),
    ],
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end();
}

function updatePerspective(request, response, requestUrl) {
  if (!isValidPreviewSession(request)) {
    return writeJson(response, 401, {ok: false, message: 'Сессия предпросмотра недействительна.'});
  }

  try {
    const nextPerspective = normalizePerspective(requestUrl.searchParams.get('perspective'));
    const currentPerspective = getPreviewPerspective(request);
    if (serializePerspective(nextPerspective) === serializePerspective(currentPerspective)) {
      response.writeHead(204, {'Cache-Control': 'private, no-store, max-age=0'});
      return response.end();
    }

    response.writeHead(200, {
      'Set-Cookie': cookie(perspectiveCookieName, serializePerspective(nextPerspective)),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    });
    response.end();
  } catch {
    writeJson(response, 400, {ok: false, message: 'Режим предпросмотра не поддерживается.'});
  }
}

async function fetchPreviewContent(request, response) {
  if (!previewConfigured) return writePreviewUnavailable(response);
  if (!isValidPreviewSession(request)) {
    return writeJson(response, 401, {ok: false, message: 'Откройте предпросмотр через Sanity Studio.'});
  }

  const client = getPreviewClient(getPreviewPerspective(request));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS);

  try {
    const content = await client.fetch(
      SANITY_SITE_CONTENT_QUERY,
      {},
      {signal: controller.signal},
    );
    writeJson(response, 200, {ok: true, content});
  } catch (error) {
    if (!IS_PRODUCTION) console.error('[Visual preview] Не удалось получить draft-контент:', error?.message);
    writeJson(response, controller.signal.aborted ? 504 : 502, {
      ok: false,
      message: 'Не удалось обновить предпросмотр. Черновик не был опубликован.',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function injectPreviewBootstrap(html) {
  const withoutRobots = html.replace(/<meta\s+[^>]*name=["']robots["'][^>]*>\s*/gi, '');
  const encodedStudioUrl = normalizedStudioUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const tags = `<meta name="robots" content="noindex,nofollow,noarchive" data-sanity-preview="true" data-sanity-studio-url="${encodedStudioUrl}">`;
  return withoutRobots.replace('</head>', `${tags}</head>`);
}

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

async function serveProductionAsset(request, response, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400);
    return response.end('Bad request');
  }

  const candidate = resolve(DIST_DIRECTORY, `.${pathname}`);
  const insideDist = candidate === DIST_DIRECTORY || candidate.startsWith(`${DIST_DIRECTORY}${sep}`);
  const isFile = insideDist && existsSync(candidate) && statSync(candidate).isFile();

  if (isFile) {
    const body = await readFile(candidate);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES.get(extname(candidate).toLowerCase()) ?? 'application/octet-stream',
      'Cache-Control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
    });
    return response.end(body);
  }

  if (String(request.headers.accept ?? '').includes('text/html')) {
    const indexPath = resolve(DIST_DIRECTORY, 'index.html');
    if (!existsSync(indexPath)) {
      response.writeHead(503, {'Content-Type': 'text/plain; charset=utf-8'});
      return response.end('Сначала выполните npm.cmd run build.');
    }
    const html = await readFile(indexPath, 'utf8');
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    });
    return response.end(html);
  }

  response.writeHead(404);
  response.end('Not found');
}

let vite = null;
if (!IS_PRODUCTION) {
  vite = await createViteServer({
    root: ROOT_DIRECTORY,
    server: {middlewareMode: true},
    appType: 'spa',
  });
}

async function servePreviewHtml(response, requestUrl) {
  const indexPath = resolve(IS_PRODUCTION ? DIST_DIRECTORY : ROOT_DIRECTORY, 'index.html');
  if (!existsSync(indexPath)) {
    response.writeHead(503, {'Content-Type': 'text/plain; charset=utf-8'});
    return response.end('Сначала выполните npm.cmd run build.');
  }

  let html = await readFile(indexPath, 'utf8');
  if (vite) html = await vite.transformIndexHtml(requestUrl.pathname, html);
  html = injectPreviewBootstrap(html);
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end(html);
}

const server = createServer(async (request, response) => {
  const host = request.headers.host || `localhost:${previewPort}`;
  const requestUrl = new URL(request.url || '/', `http://${host}`);

  try {
    if (requestUrl.pathname === '/api/draft-mode/enable') {
      return await enableDraftMode(request, response, requestUrl);
    }
    if (requestUrl.pathname === '/api/draft-mode/disable') return disableDraftMode(response);
    if (requestUrl.pathname === '/api/draft-mode/perspective') {
      return updatePerspective(request, response, requestUrl);
    }
    if (requestUrl.pathname === '/api/preview/content') {
      return await fetchPreviewContent(request, response);
    }
    if (requestUrl.pathname === '/api/preview/events') {
      return openLivePreviewEvents(request, response);
    }

    const requestsHtml = request.method === 'GET'
      && String(request.headers.accept ?? '').includes('text/html');
    if (requestsHtml && isValidPreviewSession(request)) {
      return await servePreviewHtml(response, requestUrl);
    }

    if (vite) {
      return vite.middlewares(request, response, (error) => {
        if (error) vite.ssrFixStacktrace(error);
        response.writeHead(error ? 500 : 404);
        response.end(error ? 'Internal server error' : 'Not found');
      });
    }

    return await serveProductionAsset(request, response, requestUrl);
  } catch (error) {
    if (!IS_PRODUCTION) console.error('[Visual preview] Ошибка сервера:', error?.message);
    if (!response.headersSent) response.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Не удалось открыть предпросмотр.');
  }
});

server.listen(previewPort, () => {
  console.log(`Speaker One visual preview: http://localhost:${previewPort}`);
  if (configurationErrors.length > 0) {
    console.warn(`Draft preview отключён. Проверьте: ${configurationErrors.join(', ')}.`);
  } else if (!configuredSessionSecret) {
    console.log('Используется временная локальная preview-session; после перезапуска потребуется открыть редактор заново.');
  }
});

async function shutdown() {
  liveSubscription?.unsubscribe();
  liveSubscription = null;
  liveResponses.forEach((response) => response.end());
  liveResponses.clear();
  await vite?.close();
  server.close(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
