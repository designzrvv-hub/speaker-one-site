import {useEffect, useMemo, useState} from 'react';
import {createContentAdapterResult} from '../services/contentAdapter.js';
import {loadSiteContent} from '../services/contentLoader.js';
import {
  createPreviewAnnotationTargets,
  fetchPreviewSiteContent,
} from '../services/previewContentLoader.js';

const PREVIEW_RENDERED_EVENT = 'speaker-one:preview-rendered';
const PREVIEW_STATUS_EVENT = 'speaker-one:preview-status';

function isVisualPreview() {
  return typeof document !== 'undefined'
    && document.querySelector('meta[data-sanity-preview]') !== null;
}

function publishPreviewStatus(status) {
  window.__SPEAKER_ONE_PREVIEW_STATUS__ = status;
  window.dispatchEvent(new CustomEvent(PREVIEW_STATUS_EVENT, {detail: status}));
}

export function useSiteContent() {
  const initialResult = useMemo(() => loadSiteContent(), []);
  const [result, setResult] = useState(initialResult);

  useEffect(() => {
    if (import.meta.env.DEV && result.errors.length > 0) {
      console.warn('[Speaker One CMS] Использован fallback для части контента:', result.errors);
    }
  }, [result]);

  useEffect(() => {
    if (!isVisualPreview()) return undefined;

    let active = true;
    let currentRequest = null;
    let refreshQueued = false;
    let liveRefreshTimer = null;
    const controller = new AbortController();

    const refresh = async () => {
      if (currentRequest) {
        refreshQueued = true;
        return currentRequest;
      }

      currentRequest = (async () => {
        const response = await fetchPreviewSiteContent({signal: controller.signal});
        if (!active || controller.signal.aborted) return;

        if (!response.ok) {
          publishPreviewStatus({type: 'error', message: response.message});
          if (import.meta.env.DEV) console.warn('[Speaker One preview]', response.message);
          return;
        }

        const adapted = createContentAdapterResult(response.content);
        const nextResult = {
          ...adapted,
          status: adapted.source === 'sanity-with-fallback' ? 'ready' : 'fallback',
          preview: true,
        };
        setResult(nextResult);

        window.__SPEAKER_ONE_PREVIEW_TARGETS__ = createPreviewAnnotationTargets(
          response.content,
          nextResult.config,
        );
        publishPreviewStatus(adapted.errors.length > 0 ? {
          type: 'warning',
          message: 'Часть полей не прошла проверку. Для них показаны утверждённые значения сайта.',
        } : null);

        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent(PREVIEW_RENDERED_EVENT));
        });
      })();

      try {
        await currentRequest;
      } finally {
        currentRequest = null;
        if (refreshQueued && active) {
          refreshQueued = false;
          await refresh();
        }
      }
    };

    window.__SPEAKER_ONE_REFRESH_PREVIEW__ = refresh;
    refresh();

    const liveEvents = new EventSource('/api/preview/events');
    const handleLiveContent = () => {
      window.clearTimeout(liveRefreshTimer);
      liveRefreshTimer = window.setTimeout(refresh, 120);
    };
    liveEvents.addEventListener('content', handleLiveContent);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(liveRefreshTimer);
      liveEvents.removeEventListener('content', handleLiveContent);
      liveEvents.close();
      delete window.__SPEAKER_ONE_REFRESH_PREVIEW__;
      delete window.__SPEAKER_ONE_PREVIEW_TARGETS__;
    };
  }, []);

  return result;
}
