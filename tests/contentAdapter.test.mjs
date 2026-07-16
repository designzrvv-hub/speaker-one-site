import assert from 'node:assert/strict';
import test from 'node:test';
import {CONFIG_CMS} from '../src/config/siteConfig.js';
import {
  createContentAdapterResult,
  normalizeSafeUrl,
} from '../src/services/contentAdapter.js';
import {
  fetchPublishedContent,
  getPublicSanityConfig,
} from '../src/services/sanityClient.js';

const validConfig = getPublicSanityConfig({
  VITE_SANITY_PROJECT_ID: 'project123',
  VITE_SANITY_DATASET: 'production',
  VITE_SANITY_API_VERSION: '2026-07-15',
  VITE_SANITY_USE_CDN: 'true',
});

const validImage = {
  url: 'https://cdn.sanity.io/images/project123/production/image-800x1200.jpg',
  alt: 'Андрей Чернышев во время работы',
  dimensions: {width: 800, height: 1200},
  crop: {left: 0, right: 0, top: 0, bottom: 0},
  hotspot: {x: 0.5, y: 0.35},
};

function createValidSpeechLab() {
  return {
    eyebrow: CONFIG_CMS.speechLab.eyebrow,
    title: CONFIG_CMS.speechLab.title,
    description: CONFIG_CMS.speechLab.description,
    situationLabel: CONFIG_CMS.speechLab.situationLabel,
    completedLabel: CONFIG_CMS.speechLab.completedLabel,
    progressAriaLabel: CONFIG_CMS.speechLab.progressAriaLabel,
    backLabel: CONFIG_CMS.speechLab.backLabel,
    resultEyebrow: CONFIG_CMS.speechLab.resultEyebrow,
    recommendationLabel: CONFIG_CMS.speechLab.recommendationLabel,
    ctaTitle: CONFIG_CMS.speechLab.ctaTitle,
    ctaDescription: CONFIG_CMS.speechLab.ctaDescription,
    ctaLabel: CONFIG_CMS.speechLab.resultCta,
    resetLabel: CONFIG_CMS.speechLab.resetLabel,
    questions: CONFIG_CMS.speechLab.questions.map((question, index) => ({
      internalKey: question.key,
      shortTitle: question.title,
      prompt: question.prompt,
      order: index * 10,
      options: question.options.map((option) => ({text: option.text, weight: option.points})),
    })),
    results: CONFIG_CMS.speechLab.results.map((result, index) => ({
      internalKey: result.key,
      title: result.title,
      description: result.description,
      recommendation: result.recommendation,
      minScore: result.minScore,
      maxScore: result.maxScore,
      order: index * 10,
    })),
  };
}

test('отсутствующий Sanity env сразу включает fallback без запроса', async () => {
  let requestCount = 0;
  const result = await fetchPublishedContent({
    query: '*[]',
    config: getPublicSanityConfig({}),
    fetchImpl: async () => {
      requestCount += 1;
      throw new Error('Запрос не должен выполняться');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unconfigured');
  assert.equal(requestCount, 0);
});

test('неверный Project ID не запускает сетевой запрос', async () => {
  let requestCount = 0;
  const result = await fetchPublishedContent({
    query: '*[]',
    config: getPublicSanityConfig({VITE_SANITY_PROJECT_ID: 'bad project id'}),
    fetchImpl: async () => {
      requestCount += 1;
    },
  });

  assert.equal(result.error.code, 'unconfigured');
  assert.equal(requestCount, 0);
});

test('недоступный dataset возвращает нормализованную ошибку', async () => {
  const result = await fetchPublishedContent({
    query: '*[]',
    config: validConfig,
    fetchImpl: async () => ({ok: false, status: 404}),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'http-error');
  assert.equal(result.error.status, 404);
});

test('отсутствующие документы оставляют siteConfig без изменений', () => {
  const result = createContentAdapterResult({});

  assert.equal(result.source, 'fallback');
  assert.deepEqual(result.config.hero, CONFIG_CMS.hero);
  assert.deepEqual(result.config.navigation, CONFIG_CMS.navigation);
});

test('частичный Hero заменяет только валидное поле', () => {
  const result = createContentAdapterResult({
    hero: {eyebrow: 'Новая верхняя подпись', description: ''},
  });

  assert.equal(result.source, 'sanity-with-fallback');
  assert.equal(result.config.hero.tagline, 'Новая верхняя подпись');
  assert.equal(result.config.hero.description, CONFIG_CMS.hero.description);
});

test('пустая CMS-навигация не удаляет fallback-пункты', () => {
  const result = createContentAdapterResult({navigation: {items: []}});

  assert.deepEqual(result.config.navigation.items, CONFIG_CMS.navigation.items);
  assert.equal(result.source, 'fallback');
});

test('отсутствующее или небезопасное изображение не заменяет Hero fallback', () => {
  const result = createContentAdapterResult({
    hero: {image: {url: 'javascript:alert(1)', alt: 'Описание изображения'}},
  });

  assert.equal(result.config.media.expertHeroBg, CONFIG_CMS.media.expertHeroBg);
  assert.equal(result.config.hero.imageAlt, CONFIG_CMS.hero.imageAlt);
});

test('опасные URL отклоняются, разрешённые протоколы сохраняются', () => {
  assert.equal(normalizeSafeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeSafeUrl('data:text/html,test'), null);
  assert.equal(normalizeSafeUrl('http://example.com'), null);
  assert.equal(normalizeSafeUrl('#about'), '#about');
  assert.equal(normalizeSafeUrl('mailto:hello@example.com', {allowContactProtocols: true}), 'mailto:hello@example.com');
  assert.equal(normalizeSafeUrl('http://localhost:5173/path'), 'http://localhost:5173/path');
});

test('offline и timeout не выбрасывают ошибку в приложение', async () => {
  const offline = await fetchPublishedContent({
    query: '*[]',
    config: validConfig,
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(offline.error.code, 'network-error');

  const timeout = await fetchPublishedContent({
    query: '*[]',
    config: validConfig,
    timeoutMs: 10,
    fetchImpl: async (_url, {signal}) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
    }),
  });
  assert.equal(timeout.error.code, 'timeout');
});

test('корректный CMS-контент объединяется с fallback и оптимизирует изображение', () => {
  const result = createContentAdapterResult({
    siteSettings: {
      siteName: 'Speaker One CMS',
      siteUrl: 'https://speaker-one.ru',
      socialLinks: [
        {network: 'telegram', url: 'https://t.me/speaker_one', isVisible: true},
      ],
    },
    hero: {
      titleMain: 'Заголовок из CMS',
      primaryCtaAction: 'scrollToForm',
      image: {...validImage, alt: 'Эксперт на первом экране'},
    },
    navigation: {
      items: [
        {label: 'Внешняя ссылка', href: 'https://example.com/path', order: 20, isVisible: true},
        {label: 'Подход', href: '#about', order: 10, isVisible: true},
        {label: 'Скрытый', href: '#expert', order: 5, isVisible: false},
      ],
      consultationAction: 'scrollToForm',
    },
  });

  assert.equal(result.source, 'sanity-with-fallback');
  assert.equal(result.config.brand.name, 'Speaker One CMS');
  assert.equal(result.config.hero.titleMain, 'Заголовок из CMS');
  assert.match(result.config.media.expertHeroBg, /auto=format/);
  assert.match(result.config.media.expertHeroBg, /fit=crop/);
  assert.equal(result.config.hero.imageAlt, 'Эксперт на первом экране');
  assert.deepEqual(
    result.config.navigation.items.map(({href}) => href),
    ['#about', 'https://example.com/path'],
  );
  assert.equal(result.config.navigation.items[1].openInNewTab, true);
  assert.equal(result.config.links.telegramChannel, 'https://t.me/speaker_one');
});

test('Manifesto принимает опубликованный текст и изображение, не затрагивая другие секции', () => {
  const result = createContentAdapterResult({
    manifesto: {
      isVisible: true,
      eyebrow: '// Новый подход',
      heading: 'Новый главный текст философии',
      mainText: 'Новый поясняющий текст философии',
      ctaLabel: 'Обсудить задачу',
      ctaTarget: 'scrollToForm',
      image: validImage,
    },
  });
  assert.equal(result.config.manifesto.sectionTitle, '// Новый подход');
  assert.equal(result.config.manifesto.mainText, 'Новый главный текст философии');
  assert.match(result.config.media.expertAboutCard, /w=720/);
  assert.deepEqual(result.config.results, CONFIG_CMS.results);
});

test('Competencies принимает только полностью валидный массив и поддерживает скрытие карточки', () => {
  const cards = [
    {internalKey: 'first-card', title: 'Первая', description: 'Описание первой', additionalLabels: ['Подпись'], icon: 'volume', order: 20, isVisible: true},
    {internalKey: 'second-card', title: 'Вторая', description: 'Описание второй', additionalLabels: [], icon: 'target', order: 10, isVisible: false},
  ];
  const valid = createContentAdapterResult({competencies: {cards}});
  assert.deepEqual(valid.config.results.cards.map((card) => card.key), ['first-card']);

  const invalid = createContentAdapterResult({competencies: {cards: [{...cards[0], icon: 'react-component'}]}});
  assert.deepEqual(invalid.config.results.cards, CONFIG_CMS.results.cards);
});

test('роль и фотография эксперта обновляются независимо с оптимизированным изображением', () => {
  const result = createContentAdapterResult({expert: {role: 'Новая роль эксперта', portrait: validImage}});
  assert.equal(result.config.expert.subRole, 'Новая роль эксперта');
  assert.equal(result.config.expert.portraitAlt, validImage.alt);
  assert.match(result.config.media.expertNewCard, /fit=crop/);
});

test('этапы сортируются, скрываются и отклоняются целиком при повторяющемся номере', () => {
  const items = [
    {internalKey: 'second-step', number: '02', title: 'Второй этап', description: 'Описание второго этапа', order: 20, isVisible: true},
    {internalKey: 'first-step', number: '01', title: 'Первый этап', description: 'Описание первого этапа', order: 10, isVisible: true},
    {internalKey: 'hidden-step', number: '03', title: 'Скрытый этап', description: 'Описание скрытого этапа', order: 30, isVisible: false},
  ];
  const valid = createContentAdapterResult({transformationSteps: {items}});
  assert.deepEqual(valid.config.steps.items.map((item) => item.num), ['01', '02']);

  const invalid = createContentAdapterResult({transformationSteps: {items: [{...items[0], number: '01'}, items[1]]}});
  assert.deepEqual(invalid.config.steps.items, CONFIG_CMS.steps.items);
});

test('валидный Speech Lab заменяется целиком и сохраняет обновлённый вопрос и результат', () => {
  const speechLab = createValidSpeechLab();
  speechLab.questions[0].prompt = 'Обновлённый вопрос из CMS';
  speechLab.results[0].title = 'Обновлённый результат из CMS';
  const result = createContentAdapterResult({speechLab});
  assert.equal(result.config.speechLab.questions[0].prompt, 'Обновлённый вопрос из CMS');
  assert.equal(result.config.speechLab.results[0].title, 'Обновлённый результат из CMS');
});

test('Speech Lab целиком возвращается к fallback при одном варианте, HTML или пересечении диапазонов', () => {
  const oneOption = createValidSpeechLab();
  oneOption.questions[0].options = oneOption.questions[0].options.slice(0, 1);
  assert.deepEqual(createContentAdapterResult({speechLab: oneOption}).config.speechLab, CONFIG_CMS.speechLab);

  const html = createValidSpeechLab();
  html.questions[0].prompt = '<strong>Небезопасный HTML</strong>';
  assert.deepEqual(createContentAdapterResult({speechLab: html}).config.speechLab, CONFIG_CMS.speechLab);

  const overlap = createValidSpeechLab();
  overlap.results[1].maxScore = 7;
  assert.deepEqual(createContentAdapterResult({speechLab: overlap}).config.speechLab, CONFIG_CMS.speechLab);
});

test('форма принимает публичный текст, но отклоняет небезопасные ограничения длины', () => {
  const result = createContentAdapterResult({
    leadFormContent: {
      description: 'Новое описание следующего шага',
      nameMin: 1,
      nameMax: 500,
      publicTelegramUrl: 'javascript:alert(1)',
    },
  });
  assert.equal(result.config.form.description, 'Новое описание следующего шага');
  assert.deepEqual(result.config.form.limits.name, CONFIG_CMS.form.limits.name);
  assert.equal(result.config.links.telegramBot, CONFIG_CMS.links.telegramBot);
});

test('Footer и реальные юридические строки обновляются без числового преобразования реквизитов', () => {
  const result = createContentAdapterResult({
    footer: {description: 'Новое описание Footer'},
    legal: {
      entityType: 'individualEntrepreneur',
      ownerFullName: 'Чернышев Андрей Александрович',
      inn: '744919295232',
      ogrnip: '326745600003638',
      privacyPolicyUrl: '/privacy-policy.html',
    },
  });
  assert.equal(result.config.footer.description, 'Новое описание Footer');
  assert.match(result.config.legal.inn, /744919295232/);
  assert.match(result.config.legal.ogrn, /326745600003638/);
});

test('SEO применяется на build-time конфигурацию и отклоняет опасный canonical', () => {
  const result = createContentAdapterResult({
    seo: {
      title: 'Новый SEO title',
      canonicalUrl: 'javascript:alert(1)',
      ogImage: validImage,
    },
  });
  assert.equal(result.config.seo.title, 'Новый SEO title');
  assert.equal(result.config.seo.canonicalUrl, CONFIG_CMS.seo.canonicalUrl);
  assert.match(result.config.seo.ogImage, /w=1200/);
  assert.match(result.config.seo.ogImage, /h=630/);
});

test('частично опубликованные документы заменяют только валидные простые поля', () => {
  const result = createContentAdapterResult({
    expert: {name: 'Андрей CMS', role: ''},
    footer: {brandName: 'Speaker One CMS', description: null},
  });
  assert.equal(result.config.expert.name, 'Андрей CMS');
  assert.equal(result.config.expert.subRole, CONFIG_CMS.expert.subRole);
  assert.equal(result.config.footer.brandName, 'Speaker One CMS');
  assert.equal(result.config.footer.description, CONFIG_CMS.footer.description);
});

test('единые действия кнопок используют безопасные готовые назначения', () => {
  const result = createContentAdapterResult({
    linksSettings: {
      primaryTelegram: {url: 'https://t.me/speaker_one', isVisible: true},
      telegramBot: {url: 'https://t.me/speaker_one_bot', isVisible: true},
      telegramChannel: {url: 'https://t.me/speaker_one_channel', isVisible: true},
    },
    hero: {primaryButtonAction: {actionType: 'telegramBot'}},
    navigation: {consultationButtonAction: {actionType: 'section', section: 'consultation'}},
    expert: {buttonAction: {actionType: 'telegramChannel'}},
    manifesto: {buttonAction: {actionType: 'hidden'}},
  });
  assert.equal(result.config.hero.primaryCtaTarget, 'https://t.me/speaker_one_bot');
  assert.equal(result.config.navigation.consultationTarget, 'scrollToForm');
  assert.equal(result.config.expert.telegramCtaTarget, 'https://t.me/speaker_one_channel');
  assert.equal(result.config.manifesto.ctaVisible, false);
});

test('опасное внешнее действие и пустая CMS-навигация не заменяют fallback', () => {
  const result = createContentAdapterResult({
    hero: {primaryButtonAction: {actionType: 'external', externalUrl: 'javascript:alert(1)'}},
    navigation: {
      items: [{label: 'Опасный пункт', destination: {actionType: 'external', externalUrl: 'javascript:alert(1)'}, order: 10, isVisible: true}],
    },
  });
  assert.equal(result.config.hero.primaryCtaTarget, CONFIG_CMS.hero.primaryCtaTarget);
  assert.deepEqual(result.config.navigation.items, CONFIG_CMS.navigation.items);
});
