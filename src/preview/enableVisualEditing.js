import {createDataAttribute, enableVisualEditing} from '@sanity/visual-editing';

const PREVIEW_RENDERED_EVENT = 'speaker-one:preview-rendered';
const PREVIEW_STATUS_EVENT = 'speaker-one:preview-status';
const ANNOTATION_MARKER = 'data-speaker-one-preview-annotation';
const STATUS_ELEMENT_ID = 'speaker-one-preview-status';

function getStudioUrl() {
  const value = document
    .querySelector('meta[data-sanity-preview]')
    ?.getAttribute('data-sanity-studio-url');
  if (typeof value === 'string' && value) return value;
  try {
    return document.referrer ? new URL(document.referrer).origin : '';
  } catch {
    return '';
  }
}

function annotateInteractiveFields() {
  document.querySelectorAll(`[${ANNOTATION_MARKER}]`).forEach((element) => {
    element.removeAttribute('data-sanity');
    element.removeAttribute(ANNOTATION_MARKER);
  });

  const studioUrl = getStudioUrl();
  if (!studioUrl) return;

  const targets = Array.isArray(window.__SPEAKER_ONE_PREVIEW_TARGETS__)
    ? window.__SPEAKER_ONE_PREVIEW_TARGETS__
    : [];

  targets.forEach((target) => {
    document.querySelectorAll(target.selector).forEach((element) => {
      const attribute = createDataAttribute({
        id: target.id,
        type: target.type,
        path: target.path,
        baseUrl: studioUrl,
      });
      element.setAttribute('data-sanity', attribute.toString());
      element.setAttribute(ANNOTATION_MARKER, 'true');
    });
  });
}

function renderPreviewStatus(status) {
  let element = document.getElementById(STATUS_ELEMENT_ID);
  if (!status) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('div');
    element.id = STATUS_ELEMENT_ID;
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    Object.assign(element.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483646',
      maxWidth: '360px',
      padding: '12px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(215,184,91,0.35)',
      background: 'rgba(10,10,16,0.96)',
      color: '#faf8f5',
      boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
      font: '500 14px/1.5 system-ui, sans-serif',
    });
    document.body.appendChild(element);
  }

  element.style.borderColor = status.type === 'error'
    ? 'rgba(248,113,113,0.55)'
    : 'rgba(215,184,91,0.35)';
  element.textContent = status.message;
}

function scrollToUrlHash(url) {
  if (!url.hash) return;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  target?.scrollIntoView({block: 'start'});
}

function updatePreviewHistory(update) {
  if (update.type === 'pop') {
    history.back();
    return;
  }

  const target = new URL(update.url, window.location.href);
  if (target.origin !== window.location.origin) return;
  const nextUrl = `${target.pathname}${target.search}${target.hash}`;
  if (update.type === 'push') history.pushState(null, '', nextUrl);
  if (update.type === 'replace') history.replaceState(null, '', nextUrl);
  scrollToUrlHash(target);
}

export function startVisualEditing() {
  const handleRendered = () => requestAnimationFrame(annotateInteractiveFields);
  const handleStatus = (event) => renderPreviewStatus(event.detail);
  window.addEventListener(PREVIEW_RENDERED_EVENT, handleRendered);
  window.addEventListener(PREVIEW_STATUS_EVENT, handleStatus);

  annotateInteractiveFields();
  renderPreviewStatus(window.__SPEAKER_ONE_PREVIEW_STATUS__ ?? null);

  const disable = enableVisualEditing({
    history: {
      subscribe: (navigate) => {
        const handleNavigation = () => navigate({type: 'pop', url: window.location.href});
        window.addEventListener('popstate', handleNavigation);
        window.addEventListener('hashchange', handleNavigation);
        return () => {
          window.removeEventListener('popstate', handleNavigation);
          window.removeEventListener('hashchange', handleNavigation);
        };
      },
      update: updatePreviewHistory,
    },
    refresh: () => {
      const refresh = window.__SPEAKER_ONE_REFRESH_PREVIEW__;
      return typeof refresh === 'function' ? refresh() : false;
    },
    onPerspectiveChange: async (perspective) => {
      const value = Array.isArray(perspective) ? perspective.join(',') : perspective;
      const response = await fetch(
        `/api/draft-mode/perspective?perspective=${encodeURIComponent(value)}`,
        {credentials: 'same-origin'},
      );
      if (response.status === 200) window.location.reload();
    },
  });

  const cleanup = () => {
    disable();
    window.removeEventListener(PREVIEW_RENDERED_EVENT, handleRendered);
    window.removeEventListener(PREVIEW_STATUS_EVENT, handleStatus);
    document.getElementById(STATUS_ELEMENT_ID)?.remove();
  };
  window.addEventListener('pagehide', cleanup, {once: true});
  return cleanup;
}
