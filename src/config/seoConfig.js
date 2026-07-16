import sanityContentSnapshot from '../generated/sanityContent.js';
import {createContentAdapterResult} from '../services/contentAdapter.js';

const BUILD_CONFIG = createContentAdapterResult(sanityContentSnapshot?.content ?? null).config;

const normalizeText = (value) => value.replace(/\u00a0/g, ' ').trim();
const stripTrailingSlash = (value) => value.replace(/\/+$/, '');
const absoluteUrl = (siteUrl, path) => {
  try {
    const parsed = new URL(path);
    if (['https:', 'http:'].includes(parsed.protocol)) return parsed.toString();
  } catch {
    // Локальный путь преобразуется относительно canonical ниже.
  }
  return `${stripTrailingSlash(siteUrl)}/${String(path).replace(/^\/+/, '')}`;
};

const isRealSocialLink = (value) => {
  if (!value || /your_|example\.(com|org|net)|speaker-one\.example/i.test(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const configuredSocialLinks = (
  BUILD_CONFIG.seo.socialLinks.length > 0
    ? BUILD_CONFIG.seo.socialLinks
    : [
      BUILD_CONFIG.links.vkontakte,
      BUILD_CONFIG.links.youtube,
      BUILD_CONFIG.links.dzen,
      BUILD_CONFIG.links.telegramChannel,
    ]
).filter(isRealSocialLink);

const isSanityOgImage = BUILD_CONFIG.seo.ogImage.startsWith('https://cdn.sanity.io/');

export const SEO_CONFIG = Object.freeze({
  siteName: BUILD_CONFIG.seo.siteName,
  siteUrl: stripTrailingSlash(BUILD_CONFIG.seo.canonicalUrl),
  isTemporarySiteUrl: /speaker-one\.example/i.test(BUILD_CONFIG.seo.canonicalUrl),
  title: BUILD_CONFIG.seo.title,
  description: BUILD_CONFIG.seo.description,
  ogTitle: BUILD_CONFIG.seo.ogTitle,
  ogDescription: BUILD_CONFIG.seo.ogDescription,
  locale: BUILD_CONFIG.seo.locale,
  language: 'ru',
  author: BUILD_CONFIG.seo.author,
  authorRole: normalizeText(BUILD_CONFIG.expert.subRole),
  ogImage: BUILD_CONFIG.seo.ogImage,
  ogImageAlt: BUILD_CONFIG.seo.ogImageAlt,
  ogImageWidth: isSanityOgImage ? 1200 : 1365,
  ogImageHeight: isSanityOgImage ? 630 : 2048,
  logo: BUILD_CONFIG.media.logoFull,
  favicon: BUILD_CONFIG.media.logoMark,
  appleTouchIcon: BUILD_CONFIG.media.logoFull,
  themeColor: '#050508',
  backgroundColor: '#050508',
  twitterCard: BUILD_CONFIG.seo.twitterCard,
  allowIndexing: BUILD_CONFIG.seo.allowIndexing,
  socialLinks: configuredSocialLinks,
});

export const getCanonicalUrl = () => `${stripTrailingSlash(SEO_CONFIG.siteUrl)}/`;
export const getAbsoluteOgImageUrl = () => absoluteUrl(SEO_CONFIG.siteUrl, SEO_CONFIG.ogImage);
export const getAbsoluteLogoUrl = () => absoluteUrl(SEO_CONFIG.siteUrl, SEO_CONFIG.logo);

export function createStructuredData() {
  const canonicalUrl = getCanonicalUrl();
  const organizationId = `${canonicalUrl}#organization`;
  const personId = `${canonicalUrl}#andrey-chernyshev`;
  const serviceId = `${canonicalUrl}#service`;
  const sameAs = SEO_CONFIG.socialLinks.length > 0 ? {sameAs: SEO_CONFIG.socialLinks} : {};

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: SEO_CONFIG.siteName,
        url: canonicalUrl,
        logo: {'@type': 'ImageObject', url: getAbsoluteLogoUrl()},
        legalName: normalizeText(BUILD_CONFIG.legal.owner),
        founder: {'@id': personId},
        identifier: [
          {'@type': 'PropertyValue', propertyID: 'ИНН', value: BUILD_CONFIG.legal.inn.replace(/\D/g, '')},
          {'@type': 'PropertyValue', propertyID: 'ОГРНИП', value: BUILD_CONFIG.legal.ogrn.replace(/\D/g, '')},
        ],
        ...sameAs,
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: SEO_CONFIG.author,
        jobTitle: SEO_CONFIG.authorRole,
        url: `${canonicalUrl}#expert`,
        image: absoluteUrl(SEO_CONFIG.siteUrl, BUILD_CONFIG.media.expertNewCard),
        worksFor: {'@id': organizationId},
        ...sameAs,
      },
      {
        '@type': 'Service',
        '@id': serviceId,
        name: 'Обучение ораторскому мастерству Speaker One',
        serviceType: 'Обучение ораторскому мастерству и публичным выступлениям',
        description: SEO_CONFIG.description,
        url: canonicalUrl,
        provider: {'@id': organizationId},
      },
    ],
  };
}

export function createRobotsText() {
  return [
    '# Generated from the validated build-time content snapshot by vite.config.js.',
    'User-agent: *',
    SEO_CONFIG.allowIndexing ? 'Allow: /' : 'Disallow: /',
    `Sitemap: ${absoluteUrl(SEO_CONFIG.siteUrl, '/sitemap.xml')}`,
    '',
  ].join('\n');
}

export function createSitemapXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Generated from the validated build-time content snapshot by vite.config.js. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${getCanonicalUrl()}</loc>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

export function createWebManifest() {
  return `${JSON.stringify({
    name: SEO_CONFIG.siteName,
    short_name: SEO_CONFIG.siteName,
    description: SEO_CONFIG.description,
    lang: SEO_CONFIG.language,
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: SEO_CONFIG.backgroundColor,
    theme_color: SEO_CONFIG.themeColor,
    icons: [{src: SEO_CONFIG.logo, sizes: '2048x2048', type: 'image/png', purpose: 'any'}],
  }, null, 2)}\n`;
}
