import {CONFIG_CMS} from '../config/siteConfig.js';
import {buildSanityImageUrl} from '../utils/sanityImageUrl.js';

const ALLOWED_NAVIGATION_ANCHORS = new Set([
  '#about',
  '#features',
  '#expert',
  '#speech-lab',
  '#protocol',
  '#main-content',
  '#consultation',
]);

const SAFE_ICON_NAMES = new Set(['volume', 'target', 'trending', 'compass', 'shield', 'radio']);
const SOCIAL_LINK_KEYS = Object.freeze({
  telegram: 'telegramChannel',
  vkontakte: 'vkontakte',
  youtube: 'youtube',
  dzen: 'dzen',
  rutube: 'rutube',
  instagram: 'instagram',
  whatsapp: 'whatsapp',
});
const ACTION_SECTION_TARGETS = Object.freeze({
  firstScreen: '#main-content',
  philosophy: '#about',
  competencies: '#features',
  expert: '#expert',
  speechLab: '#speech-lab',
  steps: '#protocol',
  consultation: 'scrollToForm',
});
const FORM_LIMIT_BOUNDS = Object.freeze({
  name: {min: 2, max: 80},
  contact: {min: 3, max: 120},
  message: {min: 5, max: 1000},
});
const HTML_PATTERN = /<\/?[a-z][^>]*>/i;
const STEGA_PATTERN = /[\u200b-\u200d\u2060-\u2063\ufeff\u{1d173}-\u{1d17a}]{4,}/gu;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, cloneValue(nestedValue)]),
  );
}

function splitStega(value) {
  const encoded = value.match(STEGA_PATTERN)?.join('') ?? '';
  return {cleaned: value.replace(STEGA_PATTERN, ''), encoded};
}

function cleanStega(value) {
  return typeof value === 'string' ? value.replace(STEGA_PATTERN, '') : value;
}

function normalizedText(value, {rejectHtml = false} = {}) {
  if (typeof value !== 'string') return null;
  const {cleaned, encoded} = splitStega(value);
  const visibleText = cleaned.trim();
  if (!visibleText || (rejectHtml && HTML_PATTERN.test(visibleText))) return null;
  return `${visibleText}${encoded}`;
}

function isLocalDevelopmentHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function normalizeSafeUrl(
  value,
  {allowContactProtocols = false, allowRelativePaths = false} = {},
) {
  const candidate = normalizedText(value);
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate) || candidate.includes('\\')) return null;

  if (candidate.startsWith('#')) {
    return ALLOWED_NAVIGATION_ANCHORS.has(candidate) ? candidate : null;
  }

  if (allowRelativePaths && candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate;
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol === 'https:') return url.toString();
  if (url.protocol === 'http:' && isLocalDevelopmentHost(url.hostname)) return url.toString();
  if (allowContactProtocols && ['mailto:', 'tel:'].includes(url.protocol)) {
    return url.pathname.trim() ? url.toString() : null;
  }
  return null;
}

function normalizeSiteUrl(value) {
  const safeUrl = normalizeSafeUrl(value);
  if (!safeUrl || safeUrl.startsWith('#')) return null;
  const url = new URL(safeUrl);
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  return url.toString().replace(/\/$/, '');
}

function normalizeActionTarget(value, {allowAliases = []} = {}) {
  const candidate = normalizedText(value);
  if (!candidate) return null;
  if (candidate === 'scrollToForm' || allowAliases.includes(candidate)) return candidate;
  return normalizeSafeUrl(candidate, {allowContactProtocols: true, allowRelativePaths: true});
}

function resolveButtonAction(action, config, {formTarget = 'scrollToForm'} = {}) {
  if (!isPlainObject(action)) return null;
  const actionType = cleanStega(action.actionType);
  if (actionType === 'hidden') return {visible: false, target: null};
  if (actionType === 'form') return {visible: true, target: formTarget};
  if (actionType === 'telegram') {
    return {visible: true, target: config.links.telegramPrimary || config.links.telegramBot};
  }
  if (actionType === 'telegramBot') return {visible: true, target: config.links.telegramBot};
  if (actionType === 'telegramChannel') return {visible: true, target: config.links.telegramChannel};
  if (actionType === 'section') {
    const section = cleanStega(action.section);
    const target = ACTION_SECTION_TARGETS[section];
    return target ? {visible: true, target: target === 'scrollToForm' ? formTarget : target} : null;
  }
  if (actionType === 'external') {
    const target = normalizeSafeUrl(action.externalUrl, {
      allowContactProtocols: true,
      allowRelativePaths: true,
    });
    return target ? {visible: true, target} : null;
  }
  return null;
}

function applyButtonAction(target, targetKey, visibleKey, action, config, tracker, path, options) {
  if (action == null) return false;
  const resolved = resolveButtonAction(action, config, options);
  if (!resolved) {
    tracker.errors.push(`${path}: действие кнопки отклонено.`);
    return false;
  }
  target[visibleKey] = resolved.visible;
  if (resolved.target) target[targetKey] = resolved.target;
  tracker.applied += 1;
  return true;
}

function applyText(target, key, value, tracker, errorPath, options) {
  const text = normalizedText(value, options);
  if (text) {
    target[key] = text;
    tracker.applied += 1;
    return true;
  }
  if (value != null) tracker.errors.push(`${errorPath}: ожидалась непустая строка.`);
  return false;
}

function applyOptionalText(target, key, value, tracker, errorPath, options) {
  if (value == null || value === '') return;
  applyText(target, key, value, tracker, errorPath, options);
}

function getSanityImage(media, options) {
  const url = buildSanityImageUrl(media, options);
  const alt = normalizedText(media?.alt);
  return url && alt ? {url, alt} : null;
}

function normalizeStringArray(value, {rejectHtml = false, min = 1} = {}) {
  if (!Array.isArray(value) || value.length < min) return null;
  const items = value.map((item) => normalizedText(item, {rejectHtml}));
  return items.every(Boolean) ? items : null;
}

function isFiniteOrder(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStableKey(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{1,49}$/.test(value);
}

function hasUniqueValues(items, selector) {
  const values = items.map((item) => cleanStega(selector(item)));
  return values.length === new Set(values).size;
}

function normalizeSocialLinks(items, tracker, path) {
  if (!Array.isArray(items)) return null;
  const normalized = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isPlainObject(item) || item.isVisible === false) continue;
    const configKey = SOCIAL_LINK_KEYS[item.network];
    const label = normalizedText(item.label) ?? item.network;
    const url = normalizeSafeUrl(item.url);
    if (!configKey || !label || !url || url.startsWith('#')) {
      tracker.errors.push(`${path}[${index}]: ссылка отклонена.`);
      return null;
    }
    normalized.push({key: item.network, network: item.network, label, url, configKey});
  }
  return normalized;
}

function applyLinksSettings(config, linksSettings, tracker) {
  if (linksSettings == null) return;
  if (!isPlainObject(linksSettings)) {
    tracker.errors.push('linksSettings: документ имеет неверный формат.');
    return;
  }

  const definitions = [
    ['primaryTelegram', 'telegramPrimary'],
    ['telegramBot', 'telegramBot'],
    ['telegramChannel', 'telegramChannel'],
    ['vkontakte', 'vkontakte'],
    ['youtube', 'youtube'],
    ['dzen', 'dzen'],
    ['rutube', 'rutube'],
    ['instagram', 'instagram'],
    ['whatsapp', 'whatsapp'],
    ['portfolio', 'portfolioDrive'],
  ];
  const publicSocialLinks = [];
  const socialLabels = {
    telegramChannel: ['telegram', 'Telegram'],
    vkontakte: ['vkontakte', 'VK'],
    youtube: ['youtube', 'YouTube'],
    dzen: ['dzen', 'Дзен'],
    rutube: ['rutube', 'Rutube'],
    instagram: ['instagram', 'Instagram'],
    whatsapp: ['whatsapp', 'WhatsApp'],
  };

  definitions.forEach(([field, configKey]) => {
    const item = linksSettings[field];
    if (item == null) return;
    if (!isPlainObject(item) || item.isVisible === false) return;
    const url = normalizeSafeUrl(item.url);
    if (!url || url.startsWith('#')) {
      tracker.errors.push(`linksSettings.${field}: ссылка отклонена.`);
      return;
    }
    config.links[configKey] = url;
    if (configKey === 'telegramPrimary') config.links.telegramBot = config.links.telegramBot || url;
    if (configKey === 'telegramBot') config.links.telegramBotToChannel = url;
    const social = socialLabels[configKey];
    if (social) publicSocialLinks.push({key: social[0], network: social[0], label: social[1], url});
    tracker.applied += 1;
  });

  if (publicSocialLinks.length > 0) {
    config.footer.socialLinks = publicSocialLinks;
    config.seo.socialLinks = publicSocialLinks.map(({url}) => url);
    tracker.applied += 2;
  }
}

function applySiteSettings(config, siteSettings, tracker) {
  if (siteSettings == null) return;
  if (!isPlainObject(siteSettings)) {
    tracker.errors.push('siteSettings: документ имеет неверный формат.');
    return;
  }

  if (applyText(config.brand, 'name', siteSettings.siteName, tracker, 'siteSettings.siteName')) {
    config.seo.siteName = config.brand.name;
  }
  const siteUrl = normalizeSiteUrl(siteSettings.siteUrl);
  if (siteUrl) {
    config.brand.siteUrl = siteUrl;
    config.seo.canonicalUrl = `${siteUrl}/`;
    tracker.applied += 2;
  } else if (siteSettings.siteUrl != null) {
    tracker.errors.push('siteSettings.siteUrl: небезопасный или неверный URL.');
  }

  const logoMark = getSanityImage(siteSettings.logoMark, {width: 160, fit: 'max'});
  if (logoMark) {
    config.media.logoMark = logoMark.url;
    config.brand.logoAlt = logoMark.alt;
    tracker.applied += 2;
  } else if (siteSettings.logoMark != null) {
    tracker.errors.push('siteSettings.logoMark: требуется корректное изображение с alt-текстом.');
  }

  const logoFull = getSanityImage(siteSettings.logoFull, {width: 640, fit: 'max'});
  if (logoFull) {
    config.media.logoFull = logoFull.url;
    tracker.applied += 1;
  } else if (siteSettings.logoFull != null) {
    tracker.errors.push('siteSettings.logoFull: требуется корректное изображение с alt-текстом.');
  }

  const favicon = getSanityImage(siteSettings.favicon, {width: 192, height: 192, fit: 'crop'});
  if (favicon) {
    config.media.favicon = favicon.url;
    tracker.applied += 1;
  } else if (siteSettings.favicon != null) {
    tracker.errors.push('siteSettings.favicon: требуется корректное изображение с описанием.');
  }

  applyText(config.footer, 'copyrightBrand', siteSettings.copyright, tracker, 'siteSettings.copyright');

  const primaryContact = normalizeSafeUrl(siteSettings.primaryContact, {allowContactProtocols: true});
  if (primaryContact && !primaryContact.startsWith('#')) {
    config.links.telegramBot = primaryContact;
    tracker.applied += 1;
  } else if (siteSettings.primaryContact != null) {
    tracker.errors.push('siteSettings.primaryContact: небезопасный или неверный URL.');
  }

  if (siteSettings.socialLinks != null) {
    const socialLinks = normalizeSocialLinks(siteSettings.socialLinks, tracker, 'siteSettings.socialLinks');
    if (socialLinks) {
      socialLinks.forEach(({configKey, url}) => { config.links[configKey] = url; });
      if (socialLinks.length > 0) config.seo.socialLinks = socialLinks.map(({url}) => url);
      tracker.applied += socialLinks.length;
    }
  }
}

function applyHero(config, hero, tracker) {
  if (hero == null) return;
  if (!isPlainObject(hero)) {
    tracker.errors.push('hero: документ имеет неверный формат.');
    return;
  }
  [
    ['tagline', 'eyebrow'], ['titleMain', 'titleMain'], ['titleItalic', 'titleAccent'],
    ['subtitle', 'subtitle'], ['description', 'description'], ['primaryCta', 'primaryCtaLabel'],
    ['ctaNote', 'ctaNote'], ['expertRole', 'founderLabel'],
  ].forEach(([configKey, cmsKey]) => applyText(config.hero, configKey, hero[cmsKey], tracker, `hero.${cmsKey}`));

  if (applyText(config.hero, 'expertName', hero.expertName, tracker, 'hero.expertName')) {
    config.expert.name = config.hero.expertName;
    config.seo.author = config.hero.expertName;
  }
  const expertRole = normalizedText(hero.expertRole);
  if (expertRole) {
    config.hero.proofPoints = [expertRole];
    tracker.applied += 1;
  } else if (hero.expertRole != null) tracker.errors.push('hero.expertRole: ожидалась непустая строка.');

  if (applyButtonAction(
    config.hero,
    'primaryCtaTarget',
    'primaryCtaVisible',
    hero.primaryButtonAction,
    config,
    tracker,
    'hero.primaryButtonAction',
  )) {
    // Новая единая настройка имеет приоритет над прежним служебным полем.
  } else if (hero.primaryCtaAction === 'scrollToForm') {
    config.hero.primaryCtaTarget = 'scrollToForm';
    config.hero.primaryCtaVisible = true;
    tracker.applied += 1;
  } else if (hero.primaryCtaAction != null) tracker.errors.push('hero.primaryCtaAction: неподдерживаемое действие CTA.');

  const image = getSanityImage(hero.image, {width: 920, height: 1380, fit: 'crop', quality: 90});
  if (image) {
    config.media.expertHeroBg = image.url;
    config.hero.imageAlt = image.alt;
    tracker.applied += 2;
  } else if (hero.image != null) tracker.errors.push('hero.image: требуется корректное изображение с alt-текстом.');
}

function normalizeNavigationItems(items, config, tracker) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const normalized = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isPlainObject(item)) return null;
    const label = normalizedText(item.label);
    const action = resolveButtonAction(item.destination, config, {formTarget: '#consultation'});
    const href = action?.visible === false
      ? null
      : action?.target ?? normalizeSafeUrl(item.href, {allowContactProtocols: true});
    if (!label || !href || !isFiniteOrder(item.order)) return null;
    if (item.isVisible === false || action?.visible === false) continue;
    const url = href.startsWith('#') ? null : new URL(href);
    normalized.push({
      key: typeof item._key === 'string' && item._key ? item._key : href,
      href,
      label,
      order: item.order,
      openInNewTab: Boolean(url && ['https:', 'http:'].includes(url.protocol)),
    });
  }
  if (normalized.length === 0 || !hasUniqueValues(normalized, (item) => item.href)) {
    tracker.errors.push('navigation.items: список пуст, содержит дубликаты или невалидные пункты.');
    return null;
  }
  return normalized.sort((left, right) => left.order - right.order)
    .map(({order, ...item}) => item);
}

function applyNavigation(config, navigation, tracker) {
  if (navigation == null) return;
  if (!isPlainObject(navigation)) {
    tracker.errors.push('navigation: документ имеет неверный формат.');
    return;
  }
  if (navigation.items != null) {
    const items = normalizeNavigationItems(navigation.items, config, tracker);
    if (items) {
      config.navigation.items = items;
      tracker.applied += 1;
    }
  }
  applyText(config.navigation, 'portfolioLabel', navigation.portfolioLabel, tracker, 'navigation.portfolioLabel');
  applyText(config.navigation, 'consultationLabel', navigation.consultationLabel, tracker, 'navigation.consultationLabel');
  const portfolioUrl = normalizeSafeUrl(navigation.portfolioUrl);
  if (portfolioUrl && !portfolioUrl.startsWith('#')) {
    config.links.portfolioDrive = portfolioUrl;
    tracker.applied += 1;
  } else if (navigation.portfolioUrl != null) tracker.errors.push('navigation.portfolioUrl: небезопасный или неверный URL.');
  if (applyButtonAction(
    config.navigation,
    'consultationTarget',
    'consultationVisible',
    navigation.consultationButtonAction,
    config,
    tracker,
    'navigation.consultationButtonAction',
  )) {
    // Новая единая настройка имеет приоритет.
  } else if (navigation.consultationAction === 'scrollToForm') {
    config.navigation.consultationTarget = 'scrollToForm';
    config.navigation.consultationVisible = true;
    tracker.applied += 1;
  } else if (navigation.consultationAction != null) tracker.errors.push('navigation.consultationAction: неподдерживаемое действие CTA.');
}

function applyManifesto(config, manifesto, tracker) {
  if (manifesto == null) return;
  if (!isPlainObject(manifesto)) return tracker.errors.push('manifesto: документ имеет неверный формат.');
  if (typeof manifesto.isVisible === 'boolean') {
    config.manifesto.visible = manifesto.isVisible;
    tracker.applied += 1;
  }
  applyText(config.manifesto, 'sectionTitle', manifesto.eyebrow, tracker, 'manifesto.eyebrow');
  applyText(config.manifesto, 'mainText', manifesto.heading, tracker, 'manifesto.heading');
  applyText(config.manifesto, 'quote', manifesto.mainText, tracker, 'manifesto.mainText');
  applyOptionalText(config.manifesto, 'additionalText', manifesto.additionalText, tracker, 'manifesto.additionalText');
  applyText(config.manifesto, 'ctaLabel', manifesto.ctaLabel, tracker, 'manifesto.ctaLabel');
  if (applyButtonAction(
    config.manifesto,
    'ctaTarget',
    'ctaVisible',
    manifesto.buttonAction,
    config,
    tracker,
    'manifesto.buttonAction',
  )) {
    // Новая единая настройка имеет приоритет.
  } else {
    const ctaTarget = normalizeActionTarget(manifesto.ctaTarget);
    if (ctaTarget) {
    config.manifesto.ctaTarget = ctaTarget;
    config.manifesto.ctaVisible = true;
    tracker.applied += 1;
    } else if (manifesto.ctaTarget != null) tracker.errors.push('manifesto.ctaTarget: действие или ссылка отклонены.');
  }
  const image = getSanityImage(manifesto.image, {width: 720, height: 960, fit: 'crop', quality: 86});
  if (image) {
    config.media.expertAboutCard = image.url;
    config.manifesto.imageAlt = image.alt;
    tracker.applied += 2;
  } else if (manifesto.image != null) tracker.errors.push('manifesto.image: используется локальный fallback.');
}

function normalizeCompetencyCards(cards, tracker) {
  if (!Array.isArray(cards) || cards.length === 0) return null;
  const normalized = [];
  for (const card of cards) {
    if (!isPlainObject(card) || !isStableKey(card.internalKey) || !isFiniteOrder(card.order)) return null;
    const title = normalizedText(card.title);
    const description = normalizedText(card.description);
    const labels = card.additionalLabels == null ? [] : normalizeStringArray(card.additionalLabels, {min: 0});
    if (!title || !description || !SAFE_ICON_NAMES.has(card.icon) || labels == null) return null;
    if (card.isVisible === false) continue;
    normalized.push({key: card.internalKey, title, description, icon: card.icon, additionalLabels: labels, order: card.order});
  }
  if (normalized.length === 0 || !hasUniqueValues(normalized, (card) => card.key)) {
    tracker.errors.push('competencies.cards: массив должен быть полностью валиден и содержать уникальные ключи.');
    return null;
  }
  return normalized.sort((left, right) => left.order - right.order).map(({order, ...card}) => card);
}

function applyCompetencies(config, competencies, tracker) {
  if (competencies == null) return;
  if (!isPlainObject(competencies)) return tracker.errors.push('competencies: документ имеет неверный формат.');
  applyText(config.results, 'sectionTitle', competencies.eyebrow, tracker, 'competencies.eyebrow');
  applyText(config.results, 'mainTitle', competencies.title, tracker, 'competencies.title');
  applyOptionalText(config.results, 'description', competencies.description, tracker, 'competencies.description');
  if (competencies.cards != null) {
    const cards = normalizeCompetencyCards(competencies.cards, tracker);
    if (cards) {
      config.results.cards = cards;
      tracker.applied += 1;
    }
  }
}

function normalizeExperienceCards(cards, tracker) {
  if (!Array.isArray(cards) || cards.length === 0) return null;
  const normalized = [];
  for (const card of cards) {
    if (!isPlainObject(card) || !isStableKey(card.internalKey) || !isFiniteOrder(card.order)) return null;
    const label = normalizedText(card.label);
    const text = normalizedText(card.text);
    if (!label || !text || !SAFE_ICON_NAMES.has(card.icon)) return null;
    if (card.isVisible === false) continue;
    normalized.push({key: card.internalKey, label, text, icon: card.icon, order: card.order});
  }
  if (normalized.length === 0 || !hasUniqueValues(normalized, (item) => item.key)) {
    tracker.errors.push('expert.experienceCards: массив отклонён целиком.');
    return null;
  }
  return normalized.sort((left, right) => left.order - right.order).map(({order, ...item}) => item);
}

function applyExpert(config, expert, tracker) {
  if (expert == null) return;
  if (!isPlainObject(expert)) return tracker.errors.push('expert: документ имеет неверный формат.');
  applyText(config.expert, 'sectionTitle', expert.eyebrow, tracker, 'expert.eyebrow');
  if (applyText(config.expert, 'name', expert.name, tracker, 'expert.name')) config.seo.author = config.expert.name;
  applyText(config.expert, 'subRole', expert.role, tracker, 'expert.role');
  applyText(config.expert, 'founderStatus', expert.founderStatus, tracker, 'expert.founderStatus');
  applyOptionalText(config.expert, 'description', expert.description, tracker, 'expert.description');
  applyText(config.expert, 'credentialsTitle', expert.credentialsTitle, tracker, 'expert.credentialsTitle');
  applyText(config.expert, 'audienceTitle', expert.audienceTitle, tracker, 'expert.audienceTitle');
  applyText(config.expert, 'studentsText', expert.audienceDescription, tracker, 'expert.audienceDescription');
  applyText(config.expert, 'telegramCta', expert.ctaLabel, tracker, 'expert.ctaLabel');

  if (expert.facts != null) {
    const facts = normalizeStringArray(expert.facts);
    if (facts) {
      config.expert.regalies = facts;
      tracker.applied += 1;
    } else tracker.errors.push('expert.facts: список отклонён целиком.');
  }
  if (expert.experienceCards != null) {
    const cards = normalizeExperienceCards(expert.experienceCards, tracker);
    if (cards) {
      config.expert.experienceCards = cards;
      tracker.applied += 1;
    }
  }
  if (applyButtonAction(
    config.expert,
    'telegramCtaTarget',
    'telegramCtaVisible',
    expert.buttonAction,
    config,
    tracker,
    'expert.buttonAction',
  )) {
    // Новая единая настройка имеет приоритет.
  } else {
    const telegramUrl = normalizeSafeUrl(expert.telegramUrl);
    if (telegramUrl && !telegramUrl.startsWith('#')) {
    config.links.telegramBotToChannel = telegramUrl;
    config.expert.telegramCtaTarget = telegramUrl;
    config.expert.telegramCtaVisible = true;
    tracker.applied += 1;
    } else if (expert.telegramUrl != null) tracker.errors.push('expert.telegramUrl: ссылка отклонена.');
  }

  const portrait = getSanityImage(expert.portrait, {width: 800, height: 1120, fit: 'crop', quality: 88});
  if (portrait) {
    config.media.expertNewCard = portrait.url;
    config.expert.portraitAlt = portrait.alt;
    tracker.applied += 2;
  } else if (expert.portrait != null) tracker.errors.push('expert.portrait: используется локальный fallback.');
  const workPhoto = getSanityImage(expert.workPhoto, {width: 960, height: 1200, fit: 'crop', quality: 86});
  if (workPhoto) {
    config.media.expertWork = workPhoto.url;
    config.speechLab.imageAlt = workPhoto.alt;
    tracker.applied += 2;
  } else if (expert.workPhoto != null) tracker.errors.push('expert.workPhoto: используется локальный fallback.');
}

function applyExperience(config, experience, tracker) {
  if (experience == null) return;
  if (!isPlainObject(experience)) return tracker.errors.push('experience: документ имеет неверный формат.');
  applyText(config.expert, 'credentialsTitle', experience.factsTitle, tracker, 'experience.factsTitle');
  if (experience.facts != null) {
    const facts = normalizeStringArray(experience.facts);
    if (facts) {
      config.expert.regalies = facts;
      tracker.applied += 1;
    } else tracker.errors.push('experience.facts: список отклонён целиком.');
  }
  if (experience.cards != null) {
    const cards = normalizeExperienceCards(experience.cards, tracker);
    if (cards) {
      config.expert.experienceCards = cards;
      tracker.applied += 1;
    }
  }
}

function normalizeSteps(items, tracker) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const normalized = [];
  for (const item of items) {
    if (!isPlainObject(item) || !isStableKey(item.internalKey) || !isFiniteOrder(item.order)) return null;
    const num = typeof item.number === 'number' ? String(item.number) : normalizedText(item.number);
    const title = normalizedText(item.title);
    const desc = normalizedText(item.description);
    if (!num || !title || !desc) return null;
    if (item.isVisible === false) continue;
    normalized.push({key: item.internalKey, num, title, desc, order: item.order});
  }
  if (
    normalized.length === 0
    || !hasUniqueValues(normalized, (item) => item.key)
    || !hasUniqueValues(normalized, (item) => item.num)
  ) {
    tracker.errors.push('transformationSteps.items: массив отклонён целиком.');
    return null;
  }
  return normalized.sort((left, right) => left.order - right.order).map(({order, ...item}) => item);
}

function applyTransformationSteps(config, steps, tracker) {
  if (steps == null) return;
  if (!isPlainObject(steps)) return tracker.errors.push('transformationSteps: документ имеет неверный формат.');
  applyText(config.steps, 'sectionTitle', steps.eyebrow, tracker, 'transformationSteps.eyebrow');
  applyText(config.steps, 'mainTitle', steps.title, tracker, 'transformationSteps.title');
  applyOptionalText(config.steps, 'description', steps.description, tracker, 'transformationSteps.description');
  applyText(config.steps, 'itemLabel', steps.itemLabel, tracker, 'transformationSteps.itemLabel');
  if (steps.items != null) {
    const items = normalizeSteps(steps.items, tracker);
    if (items) {
      config.steps.items = items;
      tracker.applied += 1;
    }
  }
}

function normalizeSpeechLab(speechLab, tracker) {
  if (!isPlainObject(speechLab)) return null;
  const textMap = {
    eyebrow: 'eyebrow', title: 'title', description: 'description', situationLabel: 'situationLabel',
    completedLabel: 'completedLabel', progressAriaLabel: 'progressAriaLabel', backLabel: 'backLabel',
    resultEyebrow: 'resultEyebrow', recommendationLabel: 'recommendationLabel', ctaTitle: 'ctaTitle',
    ctaDescription: 'ctaDescription', ctaLabel: 'resultCta', resetLabel: 'resetLabel',
  };
  const output = {};
  for (const [cmsKey, configKey] of Object.entries(textMap)) {
    const text = normalizedText(speechLab[cmsKey], {rejectHtml: true});
    if (!text) {
      tracker.errors.push(`speechLab.${cmsKey}: обязательный обычный текст отсутствует или содержит HTML.`);
      return null;
    }
    output[configKey] = text;
  }
  if (!Array.isArray(speechLab.questions) || speechLab.questions.length === 0) return null;
  const questions = [];
  for (const question of speechLab.questions) {
    if (!isPlainObject(question) || !isStableKey(question.internalKey) || !isFiniteOrder(question.order)) return null;
    const title = normalizedText(question.shortTitle, {rejectHtml: true});
    const prompt = normalizedText(question.prompt, {rejectHtml: true});
    if (!title || !prompt || !Array.isArray(question.options) || question.options.length < 2) return null;
    const options = question.options.map((option, optionIndex) => ({
      key: typeof option?._key === 'string' && option._key ? option._key : `option-${optionIndex + 1}`,
      text: normalizedText(option?.text, {rejectHtml: true}),
      points: option?.weight,
    }));
    if (!options.every((option) => option.text && Number.isInteger(option.points))) return null;
    questions.push({key: question.internalKey, title, prompt, options, order: question.order});
  }
  if (!hasUniqueValues(questions, (question) => question.key)) return null;
  questions.sort((left, right) => left.order - right.order);

  if (!Array.isArray(speechLab.results) || speechLab.results.length === 0) return null;
  const results = [];
  for (const result of speechLab.results) {
    if (!isPlainObject(result) || !isStableKey(result.internalKey) || !isFiniteOrder(result.order)) return null;
    const normalized = {
      key: result.internalKey,
      title: normalizedText(result.title, {rejectHtml: true}),
      description: normalizedText(result.description, {rejectHtml: true}),
      recommendation: normalizedText(result.recommendation, {rejectHtml: true}),
      minScore: result.minScore,
      maxScore: result.maxScore,
      order: result.order,
    };
    if (
      !normalized.title || !normalized.description || !normalized.recommendation
      || !Number.isInteger(normalized.minScore) || !Number.isInteger(normalized.maxScore)
      || normalized.minScore > normalized.maxScore
    ) return null;
    results.push(normalized);
  }
  if (!hasUniqueValues(results, (result) => result.key)) return null;
  const ascendingRanges = [...results].sort((left, right) => left.minScore - right.minScore);
  for (let index = 1; index < ascendingRanges.length; index += 1) {
    if (ascendingRanges[index].minScore <= ascendingRanges[index - 1].maxScore) return null;
    if (ascendingRanges[index].minScore > ascendingRanges[index - 1].maxScore + 1) return null;
  }
  const minimumPossible = questions.reduce(
    (sum, question) => sum + Math.min(...question.options.map((option) => option.points)),
    0,
  );
  const maximumPossible = questions.reduce(
    (sum, question) => sum + Math.max(...question.options.map((option) => option.points)),
    0,
  );
  if (ascendingRanges[0].minScore > minimumPossible || ascendingRanges.at(-1).maxScore < maximumPossible) return null;

  output.questions = questions.map(({order, ...question}) => question);
  output.results = results.sort((left, right) => right.minScore - left.minScore)
    .map(({order, ...result}) => result);
  output.optionLabels = Array.from(
    {length: Math.max(...output.questions.map((question) => question.options.length))},
    (_, index) => String(index + 1).padStart(2, '0'),
  );
  return output;
}

function applySpeechLab(config, speechLab, tracker) {
  if (speechLab == null) return;
  const normalized = normalizeSpeechLab(speechLab, tracker);
  if (!normalized) {
    tracker.errors.push('speechLab: структура отклонена целиком, используется полный fallback Speech Lab.');
    return;
  }
  config.speechLab = {...config.speechLab, ...normalized};
  tracker.applied += 1;
  applyButtonAction(
    config.speechLab,
    'resultCtaTarget',
    'resultCtaVisible',
    speechLab.buttonAction,
    config,
    tracker,
    'speechLab.buttonAction',
  );
  const image = getSanityImage(speechLab.image, {width: 900, height: 1200, fit: 'crop', quality: 86});
  if (image) {
    config.media.expertWork = image.url;
    config.speechLab.imageAlt = image.alt;
    tracker.applied += 2;
  } else if (speechLab.image != null) tracker.errors.push('speechLab.image: используется локальный fallback.');
}

function applyLegal(config, legal, tracker) {
  if (legal == null) return;
  if (!isPlainObject(legal)) return tracker.errors.push('legal: документ имеет неверный формат.');
  const ownerName = normalizedText(legal.ownerFullName);
  if (ownerName && legal.entityType === 'individualEntrepreneur') {
    config.legal.owner = `Индивидуальный\u00a0предприниматель ${ownerName.replace(/[ \t]+/g, '\u00a0')}`;
    tracker.applied += 1;
  } else if (legal.ownerFullName != null) tracker.errors.push('legal.ownerFullName: данные отклонены.');
  if (typeof legal.inn === 'string' && /^\d{12}$/.test(legal.inn)) {
    config.legal.inn = `ИНН\u00a0${legal.inn}`;
    tracker.applied += 1;
  } else if (legal.inn != null) tracker.errors.push('legal.inn: требуется строка из 12 цифр.');
  if (typeof legal.ogrnip === 'string' && /^\d{15}$/.test(legal.ogrnip)) {
    config.legal.ogrn = `ОГРНИП\u00a0${legal.ogrnip}`;
    tracker.applied += 1;
  } else if (legal.ogrnip != null) tracker.errors.push('legal.ogrnip: требуется строка из 15 цифр.');
  const policyUrl = normalizeSafeUrl(legal.privacyPolicyUrl, {allowRelativePaths: true});
  if (policyUrl) {
    config.legal.privacyPolicyLink = policyUrl;
    tracker.applied += 1;
  } else if (legal.privacyPolicyUrl != null) tracker.errors.push('legal.privacyPolicyUrl: ссылка отклонена.');
  applyText(config.form, 'legalPrefix', legal.consentPrefix, tracker, 'legal.consentPrefix');
  applyText(config.form, 'legalLinkLabel', legal.consentLinkLabel, tracker, 'legal.consentLinkLabel');
  applyText(config.form, 'legalSuffix', legal.consentSuffix, tracker, 'legal.consentSuffix');
}

function applyFormLimits(config, form, tracker) {
  for (const field of ['name', 'contact', 'message']) {
    const min = form[`${field}Min`];
    const max = form[`${field}Max`];
    if (min == null && max == null) continue;
    const bounds = FORM_LIMIT_BOUNDS[field];
    if (
      Number.isInteger(min) && Number.isInteger(max)
      && min >= bounds.min && max <= bounds.max && min <= max
    ) {
      config.form.limits[field] = {min, max};
      tracker.applied += 1;
    } else tracker.errors.push(`leadFormContent.${field}Min/${field}Max: используется безопасный fallback.`);
  }
}

function applyLeadForm(config, form, tracker) {
  if (form == null) return;
  if (!isPlainObject(form)) return tracker.errors.push('leadFormContent: документ имеет неверный формат.');
  const topLevelText = {
    eyebrow: 'eyebrow', title: 'title', description: 'description', submitLabel: 'submitLabel',
    submittingLabel: 'submittingLabel', telegramLabel: 'telegramLabel', legalPrefix: 'legalPrefix',
    legalLinkLabel: 'legalLinkLabel', legalSuffix: 'legalSuffix',
  };
  Object.entries(topLevelText).forEach(([cmsKey, configKey]) => {
    applyText(config.form, configKey, form[cmsKey], tracker, `leadFormContent.${cmsKey}`);
  });
  const fieldMap = {
    name: ['nameLabel', 'namePlaceholder', 'nameHint'],
    contact: ['contactLabel', 'contactPlaceholder', 'contactHint'],
    message: ['messageLabel', 'messagePlaceholder', 'messageHint'],
  };
  Object.entries(fieldMap).forEach(([field, [label, placeholder, hint]]) => {
    applyText(config.form.fields[field], 'label', form[label], tracker, `leadFormContent.${label}`);
    applyText(config.form.fields[field], 'placeholder', form[placeholder], tracker, `leadFormContent.${placeholder}`);
    applyText(config.form.fields[field], 'hint', form[hint], tracker, `leadFormContent.${hint}`);
  });
  const messageMap = {
    idleMessage: 'idle', successMessage: 'success', errorMessage: 'error',
    unavailableMessage: 'unavailable', validationMessage: 'validation',
  };
  Object.entries(messageMap).forEach(([cmsKey, configKey]) => {
    if (cmsKey === 'idleMessage') applyOptionalText(config.form.messages, configKey, form[cmsKey], tracker, `leadFormContent.${cmsKey}`);
    else applyText(config.form.messages, configKey, form[cmsKey], tracker, `leadFormContent.${cmsKey}`);
  });
  const validationMap = {
    nameRequiredMessage: 'nameRequired', nameLengthMessage: 'nameLength',
    contactRequiredMessage: 'contactRequired', contactLengthMessage: 'contactLength',
    messageRequiredMessage: 'messageRequired', messageLengthMessage: 'messageLength',
    consentRequiredMessage: 'consentRequired',
  };
  Object.entries(validationMap).forEach(([cmsKey, configKey]) => {
    applyText(config.form.validation, configKey, form[cmsKey], tracker, `leadFormContent.${cmsKey}`);
  });
  applyFormLimits(config, form, tracker);
  applyButtonAction(
    config.form,
    'telegramTarget',
    'telegramActionVisible',
    form.fallbackButtonAction,
    config,
    tracker,
    'leadFormContent.fallbackButtonAction',
  );
  const telegram = normalizeSafeUrl(form.publicTelegramUrl);
  if (telegram && !telegram.startsWith('#')) {
    config.links.telegramBot = telegram;
    tracker.applied += 1;
  } else if (form.publicTelegramUrl != null) tracker.errors.push('leadFormContent.publicTelegramUrl: ссылка отклонена.');
  const policy = normalizeSafeUrl(form.privacyPolicyUrl, {allowRelativePaths: true});
  if (policy) {
    config.legal.privacyPolicyLink = policy;
    tracker.applied += 1;
  } else if (form.privacyPolicyUrl != null) tracker.errors.push('leadFormContent.privacyPolicyUrl: ссылка отклонена.');
}

function normalizeFooterNavigation(items, config, tracker) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const normalized = [];
  for (const item of items) {
    if (!isPlainObject(item) || !isStableKey(item.internalKey) || !isFiniteOrder(item.order)) return null;
    const label = normalizedText(item.label);
    const action = resolveButtonAction(item.action, config, {formTarget: '#consultation'});
    let href = action?.visible === false
      ? null
      : action?.target ?? normalizeActionTarget(item.href, {allowAliases: ['portfolio', 'privacy']});
    if (href === 'portfolio') href = config.links.portfolioDrive;
    if (href === 'privacy') href = config.legal.privacyPolicyLink;
    if (!label || !href) return null;
    if (item.isVisible === false || action?.visible === false) continue;
    normalized.push({key: item.internalKey, label, href, order: item.order});
  }
  if (normalized.length === 0 || !hasUniqueValues(normalized, (item) => item.key)) {
    tracker.errors.push('footer.navigationLinks: массив отклонён целиком.');
    return null;
  }
  return normalized.sort((left, right) => left.order - right.order).map(({order, ...item}) => item);
}

function applyFooter(config, footer, tracker) {
  if (footer == null) return;
  if (!isPlainObject(footer)) return tracker.errors.push('footer: документ имеет неверный формат.');
  applyText(config.footer, 'brandName', footer.brandName, tracker, 'footer.brandName');
  applyText(config.footer, 'description', footer.description, tracker, 'footer.description');
  applyText(config.footer, 'navigationTitle', footer.navigationTitle, tracker, 'footer.navigationTitle');
  applyText(config.footer, 'mediaTitle', footer.socialTitle, tracker, 'footer.socialTitle');
  applyText(config.footer, 'copyrightBrand', footer.copyright, tracker, 'footer.copyright');
  applyText(config.footer, 'studioStatus', footer.statusText, tracker, 'footer.statusText');
  if (footer.navigationLinks != null) {
    const links = normalizeFooterNavigation(footer.navigationLinks, config, tracker);
    if (links) {
      config.footer.navigationLinks = links;
      tracker.applied += 1;
    }
  }
  if (footer.socialLinks != null) {
    const socialLinks = normalizeSocialLinks(footer.socialLinks, tracker, 'footer.socialLinks');
    if (socialLinks && socialLinks.length > 0) {
      socialLinks.forEach(({configKey, url}) => { config.links[configKey] = url; });
      config.footer.socialLinks = socialLinks.map(({configKey, ...item}) => item);
      tracker.applied += 1;
    } else if (socialLinks) tracker.errors.push('footer.socialLinks: пустой список, используется fallback.');
  }
}

function applySeo(config, seo, tracker) {
  if (seo == null) return;
  if (!isPlainObject(seo)) return tracker.errors.push('seo: документ имеет неверный формат.');
  ['siteName', 'author', 'locale', 'title', 'description', 'ogTitle', 'ogDescription', 'twitterCard']
    .forEach((key) => applyText(config.seo, key, seo[key], tracker, `seo.${key}`));
  const canonical = normalizeSiteUrl(seo.canonicalUrl);
  if (canonical) {
    config.seo.canonicalUrl = `${canonical}/`;
    tracker.applied += 1;
  } else if (seo.canonicalUrl != null) tracker.errors.push('seo.canonicalUrl: URL отклонён.');
  if (typeof seo.allowIndexing === 'boolean') {
    config.seo.allowIndexing = seo.allowIndexing;
    tracker.applied += 1;
  }
  if (seo.socialLinks != null) {
    const socialLinks = normalizeSocialLinks(seo.socialLinks, tracker, 'seo.socialLinks');
    if (socialLinks && socialLinks.length > 0) {
      config.seo.socialLinks = socialLinks.map(({url}) => url);
      tracker.applied += 1;
    }
  }
  const ogImage = getSanityImage(seo.ogImage, {width: 1200, height: 630, fit: 'crop', quality: 90});
  if (ogImage) {
    config.seo.ogImage = ogImage.url;
    config.seo.ogImageAlt = ogImage.alt;
    tracker.applied += 2;
  } else if (seo.ogImage != null) tracker.errors.push('seo.ogImage: используется локальный fallback.');
}

export function createContentAdapterResult(sanityContent, fallbackConfig = CONFIG_CMS) {
  const config = cloneValue(fallbackConfig);
  const tracker = {applied: 0, errors: []};
  if (sanityContent != null && !isPlainObject(sanityContent)) {
    tracker.errors.push('Корневой объект Sanity имеет неверный формат.');
  } else if (isPlainObject(sanityContent)) {
    applySiteSettings(config, sanityContent.siteSettings, tracker);
    applyLinksSettings(config, sanityContent.linksSettings, tracker);
    applyHero(config, sanityContent.hero, tracker);
    applyNavigation(config, sanityContent.navigation, tracker);
    applyManifesto(config, sanityContent.manifesto, tracker);
    applyCompetencies(config, sanityContent.competencies, tracker);
    applyExpert(config, sanityContent.expert, tracker);
    applyExperience(config, sanityContent.experience, tracker);
    applyTransformationSteps(config, sanityContent.transformationSteps, tracker);
    applySpeechLab(config, sanityContent.speechLab, tracker);
    applyLegal(config, sanityContent.legal, tracker);
    applyLeadForm(config, sanityContent.leadFormContent, tracker);
    applyFooter(config, sanityContent.footer, tracker);
    applySeo(config, sanityContent.seo, tracker);
    applyLinksSettings(config, sanityContent.linksSettings, tracker);
  }
  return {
    config,
    source: tracker.applied > 0 ? 'sanity-with-fallback' : 'fallback',
    errors: tracker.errors,
  };
}
