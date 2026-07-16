import {handleLeadHealthRequest, handleLeadRequest, handleLeadTestRequest} from '../leadEndpoint.mjs';

async function toWebRequest(request) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const url = `${protocol}://${request.headers.host}${request.url}`;
  const chunks = [];
  if (!['GET', 'HEAD'].includes(request.method)) {
    for await (const chunk of request) chunks.push(chunk);
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(url, {method: request.method, headers: request.headers, body, duplex: body ? 'half' : undefined});
}

async function writeWebResponse(webResponse, response) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

export default async function handler(request, response) {
  const webRequest = await toWebRequest(request);
  const path = new URL(webRequest.url).pathname;
  const result = path.endsWith('/health')
    ? await handleLeadHealthRequest(webRequest)
    : path.endsWith('/test')
      ? await handleLeadTestRequest(webRequest)
      : await handleLeadRequest(webRequest);
  await writeWebResponse(result, response);
}
