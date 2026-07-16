import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SEO_CONFIG,
  createRobotsText,
  createSitemapXml,
  createStructuredData,
  createWebManifest,
  getAbsoluteOgImageUrl,
  getCanonicalUrl,
} from './src/config/seoConfig.js';

function speakerOneSeoPlugin() {
  const canonicalUrl = getCanonicalUrl();
  const ogImageUrl = getAbsoluteOgImageUrl();
  const structuredData = JSON.stringify(createStructuredData()).replace(/</g, '\\u003c');

  return {
    name: 'speaker-one-seo',
    configResolved(config) {
      const publicDirectory = resolve(config.root, 'public');
      mkdirSync(publicDirectory, { recursive: true });
      writeFileSync(resolve(publicDirectory, 'robots.txt'), createRobotsText(), 'utf8');
      writeFileSync(resolve(publicDirectory, 'sitemap.xml'), createSitemapXml(), 'utf8');
      writeFileSync(resolve(publicDirectory, 'site.webmanifest'), createWebManifest(), 'utf8');
    },
    transformIndexHtml() {
      return {
        tags: [
          { tag: 'title', children: SEO_CONFIG.title, injectTo: 'head-prepend' },
          { tag: 'meta', attrs: { name: 'description', content: SEO_CONFIG.description }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'author', content: SEO_CONFIG.author }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'robots', content: SEO_CONFIG.allowIndexing ? 'index,follow,max-image-preview:large' : 'noindex,nofollow' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'theme-color', content: SEO_CONFIG.themeColor }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'canonical', href: canonicalUrl }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'icon', type: 'image/png', href: SEO_CONFIG.favicon }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'apple-touch-icon', href: SEO_CONFIG.appleTouchIcon }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:title', content: SEO_CONFIG.ogTitle }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:description', content: SEO_CONFIG.ogDescription }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: canonicalUrl }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image', content: ogImageUrl }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:alt', content: SEO_CONFIG.ogImageAlt }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:width', content: String(SEO_CONFIG.ogImageWidth) }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:height', content: String(SEO_CONFIG.ogImageHeight) }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/jpeg' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:site_name', content: SEO_CONFIG.siteName }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:locale', content: SEO_CONFIG.locale }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:card', content: SEO_CONFIG.twitterCard }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:title', content: SEO_CONFIG.ogTitle }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:description', content: SEO_CONFIG.ogDescription }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:image', content: ogImageUrl }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:image:alt', content: SEO_CONFIG.ogImageAlt }, injectTo: 'head' },
          { tag: 'script', attrs: { type: 'application/ld+json' }, children: structuredData, injectTo: 'head' },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), speakerOneSeoPlugin()],
});
