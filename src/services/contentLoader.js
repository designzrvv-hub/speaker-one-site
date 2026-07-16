import sanityContentSnapshot from '../generated/sanityContent.js';
import {createContentAdapterResult} from './contentAdapter.js';
export {SANITY_SITE_CONTENT_QUERY} from './contentQuery.js';

export const SITE_CONTENT_STATUS = Object.freeze({
  loading: 'loading',
  ready: 'ready',
  fallback: 'fallback',
});

export function loadSiteContent(snapshot = sanityContentSnapshot) {
  const cmsContent = snapshot?.content ?? null;
  const adapted = createContentAdapterResult(cmsContent);

  return {
    ...adapted,
    status:
      adapted.source === 'sanity-with-fallback'
        ? SITE_CONTENT_STATUS.ready
        : SITE_CONTENT_STATUS.fallback,
  };
}
