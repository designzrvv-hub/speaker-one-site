import {handleLeadHealthRequest, handleLeadRequest, handleLeadTestRequest} from '../leadEndpoint.mjs';

export async function handler(event) {
  const origin = event.headers?.origin || 'https://localhost';
  const url = new URL(event.rawUrl || event.url || '/api/leads', origin);
  const request = new Request(url, {
    method: event.httpMethod || 'GET',
    headers: event.headers || {},
    body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : event.body,
  });
  const result = url.pathname.endsWith('/health')
    ? await handleLeadHealthRequest(request)
    : url.pathname.endsWith('/test')
      ? await handleLeadTestRequest(request)
      : await handleLeadRequest(request);
  return {
    statusCode: result.status,
    headers: Object.fromEntries(result.headers),
    body: await result.text(),
  };
}
