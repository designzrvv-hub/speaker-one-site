import {handleLeadHealthRequest, handleLeadRequest, handleLeadTestRequest} from '../leadEndpoint.mjs';

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  const options = {environment: context.env};
  if (path.endsWith('/health')) return handleLeadHealthRequest(context.request, options);
  if (path.endsWith('/test')) return handleLeadTestRequest(context.request, options);
  return handleLeadRequest(context.request, options);
}
