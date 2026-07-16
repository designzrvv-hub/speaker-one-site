import {writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite';
import {SANITY_SITE_CONTENT_QUERY} from '../src/services/contentQuery.js';
import {fetchPublishedContent, getPublicSanityConfig} from '../src/services/sanityClient.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = resolve(projectRoot, 'src/generated/sanityContent.js');
const fileEnvironment = loadEnv('production', projectRoot, 'VITE_');
const publicEnvironment = {
  VITE_SANITY_PROJECT_ID:
    process.env.VITE_SANITY_PROJECT_ID ?? fileEnvironment.VITE_SANITY_PROJECT_ID,
  VITE_SANITY_DATASET:
    process.env.VITE_SANITY_DATASET ?? fileEnvironment.VITE_SANITY_DATASET,
  VITE_SANITY_API_VERSION:
    process.env.VITE_SANITY_API_VERSION ?? fileEnvironment.VITE_SANITY_API_VERSION,
  VITE_SANITY_USE_CDN:
    process.env.VITE_SANITY_USE_CDN ?? fileEnvironment.VITE_SANITY_USE_CDN,
};

const config = getPublicSanityConfig(publicEnvironment);
const result = await fetchPublishedContent({
  query: SANITY_SITE_CONTENT_QUERY,
  config,
  timeoutMs: 12000,
});

if (!result.ok) {
  const reason = result.error?.code === 'unconfigured'
    ? 'Sanity env не заполнен'
    : `Sanity недоступна (${result.error?.code ?? 'unknown'})`;
  console.warn(`[content:fetch] ${reason}; используется существующий snapshot/siteConfig fallback.`);
  process.exit(0);
}

const content = result.data;
const hasKnownDocument = content
  && typeof content === 'object'
  && !Array.isArray(content)
  && [
    'siteSettings',
    'linksSettings',
    'hero',
    'navigation',
    'manifesto',
    'competencies',
    'expert',
    'experience',
    'transformationSteps',
    'speechLab',
    'leadFormContent',
    'footer',
    'legal',
    'seo',
  ].some(
    (documentName) => content[documentName] && typeof content[documentName] === 'object',
  );

if (!hasKnownDocument) {
  console.warn('[content:fetch] Опубликованные документы не найдены; существующий snapshot не изменён.');
  process.exit(0);
}

const serializedSnapshot = JSON.stringify(
  {source: 'sanity-published', content},
  null,
  2,
)
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

writeFileSync(
  snapshotPath,
  `const sanityContentSnapshot = ${serializedSnapshot};\n\nexport default Object.freeze(sanityContentSnapshot);\n`,
  'utf8',
);

console.log('[content:fetch] Published snapshot обновлён для подключённых singleton-разделов сайта.');
