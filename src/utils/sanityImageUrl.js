const SANITY_IMAGE_ORIGIN = 'https://cdn.sanity.io';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getCropRectangle(image) {
  const sourceWidth = finiteNumber(image?.dimensions?.width);
  const sourceHeight = finiteNumber(image?.dimensions?.height);
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) return null;

  const left = clamp(finiteNumber(image?.crop?.left) ?? 0, 0, 1);
  const right = clamp(finiteNumber(image?.crop?.right) ?? 0, 0, 1);
  const top = clamp(finiteNumber(image?.crop?.top) ?? 0, 0, 1);
  const bottom = clamp(finiteNumber(image?.crop?.bottom) ?? 0, 0, 1);

  const width = Math.max(1, Math.round(sourceWidth * (1 - left - right)));
  const height = Math.max(1, Math.round(sourceHeight * (1 - top - bottom)));

  return {
    x: Math.round(sourceWidth * left),
    y: Math.round(sourceHeight * top),
    width,
    height,
    sourceWidth,
    sourceHeight,
  };
}

function applyHotspot(url, image, cropRectangle) {
  const hotspotX = finiteNumber(image?.hotspot?.x);
  const hotspotY = finiteNumber(image?.hotspot?.y);
  if (hotspotX == null || hotspotY == null || !cropRectangle) return;

  const focalX = clamp(
    (hotspotX * cropRectangle.sourceWidth - cropRectangle.x) / cropRectangle.width,
    0,
    1,
  );
  const focalY = clamp(
    (hotspotY * cropRectangle.sourceHeight - cropRectangle.y) / cropRectangle.height,
    0,
    1,
  );

  url.searchParams.set('crop', 'focalpoint');
  url.searchParams.set('fp-x', focalX.toFixed(4));
  url.searchParams.set('fp-y', focalY.toFixed(4));
}

export function buildSanityImageUrl(image, {
  width,
  height,
  fit = 'max',
  quality = 88,
} = {}) {
  if (typeof image?.url !== 'string' || !image.url.trim()) return null;

  let url;
  try {
    url = new URL(image.url.trim());
  } catch {
    return null;
  }

  if (url.origin !== SANITY_IMAGE_ORIGIN || !url.pathname.startsWith('/images/')) return null;

  url.search = '';
  const cropRectangle = getCropRectangle(image);
  if (cropRectangle && image?.crop) {
    url.searchParams.set(
      'rect',
      [cropRectangle.x, cropRectangle.y, cropRectangle.width, cropRectangle.height].join(','),
    );
  }

  if (Number.isInteger(width) && width > 0) url.searchParams.set('w', String(width));
  if (Number.isInteger(height) && height > 0) url.searchParams.set('h', String(height));
  url.searchParams.set('fit', fit === 'crop' ? 'crop' : 'max');
  if (fit === 'crop') applyHotspot(url, image, cropRectangle);
  url.searchParams.set('auto', 'format');
  url.searchParams.set('q', String(clamp(Math.round(quality), 1, 100)));

  return url.toString();
}
