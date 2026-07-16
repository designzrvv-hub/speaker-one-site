import {buildSanityImageUrl} from '../utils/sanityImageUrl.js';

const PREVIEW_CONTENT_ENDPOINT = '/api/preview/content';

function failure(message, status) {
  return {ok: false, content: null, message, status};
}

export async function fetchPreviewSiteContent({signal, fetchImpl = fetch} = {}) {
  let response;
  try {
    response = await fetchImpl(PREVIEW_CONTENT_ENDPOINT, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
      signal,
    });
  } catch {
    return failure('Не удалось связаться с защищённым предпросмотром.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return failure('Предпросмотр вернул ответ в неизвестном формате.', response.status);
  }

  if (!response.ok || payload?.ok !== true) {
    return failure(
      payload?.message || 'Не удалось обновить предпросмотр.',
      response.status,
    );
  }

  return {ok: true, content: payload.content ?? null, message: '', status: response.status};
}

function isAppliedImage(media, renderedUrl, options) {
  if (!media?._id || typeof media.alt !== 'string' || !media.alt.trim()) return false;
  const cmsUrl = buildSanityImageUrl(media, options);
  return Boolean(cmsUrl && cmsUrl === renderedUrl);
}

const STEGA_PATTERN = /[\u200b-\u200d\u2060-\u2063\ufeff\u{1d173}-\u{1d17a}]/gu;
const SAFE_KEY_PATTERN = /^[a-z0-9_-]+$/i;

function visibleText(value) {
  return typeof value === 'string' ? value.replace(STEGA_PATTERN, '').trim() : '';
}

function isAppliedText(source, rendered) {
  return Boolean(visibleText(source) && visibleText(source) === visibleText(rendered));
}

function keyedPath(arrayName, key, fieldName) {
  return SAFE_KEY_PATTERN.test(key || '') ? `${arrayName}[_key=="${key}"].${fieldName}` : '';
}

function addTarget(targets, target) {
  if (target?.selector && target?.id && target?.type && target?.path) targets.push(target);
}

export function createPreviewAnnotationTargets(content, config) {
  if (!content || !config) return [];
  const targets = [];

  const buttonTargets = [
    ['[data-preview-target="navigation-consultation"]', 'navigation', 'navigation', 'consultationLabel', content.navigation?.consultationLabel, config.navigation?.consultationLabel],
    ['[data-preview-target="hero-primary-cta"]', 'hero', 'hero', 'primaryCtaLabel', content.hero?.primaryCtaLabel, config.hero?.primaryCta],
    ['[data-preview-target="manifesto-cta"]', 'manifesto', 'manifesto', 'ctaLabel', content.manifesto?.ctaLabel, config.manifesto?.ctaLabel],
    ['[data-preview-target="expert-cta"]', 'expert', 'expert', 'ctaLabel', content.expert?.ctaLabel, config.expert?.telegramCta],
    ['[data-preview-target="speech-result-cta"]', 'speechLab', 'speechLab', 'ctaLabel', content.speechLab?.ctaLabel, config.speechLab?.resultCta],
    ['[data-preview-target="form-submit"]', 'leadFormContent', 'leadFormContent', 'submitLabel', content.leadFormContent?.submitLabel, config.form?.submitLabel],
    ['[data-preview-target="form-telegram-action"]', 'leadFormContent', 'leadFormContent', 'telegramLabel', content.leadFormContent?.telegramLabel, config.form?.telegramLabel],
  ];
  buttonTargets.forEach(([selector, id, type, path, source, rendered]) => {
    if (isAppliedText(source, rendered)) addTarget(targets, {selector, id, type, path});
  });

  if (isAppliedImage(content.siteSettings?.logoMark, config.media.logoMark, {width: 160, fit: 'max'})) {
    addTarget(targets, {selector: 'nav img', id: content.siteSettings.logoMark._id, type: 'media', path: 'asset'});
  }
  if (isAppliedImage(content.hero?.image, config.media.expertHeroBg, {
    width: 920, height: 1380, fit: 'crop', quality: 90,
  })) {
    addTarget(targets, {selector: '.hero-portrait-image', id: content.hero.image._id, type: 'media', path: 'asset'});
  }
  if (isAppliedImage(content.manifesto?.image, config.media.expertAboutCard, {
    width: 720, height: 960, fit: 'crop', quality: 86,
  })) {
    addTarget(targets, {selector: '#about img', id: content.manifesto.image._id, type: 'media', path: 'asset'});
  }
  if (isAppliedImage(content.expert?.portrait, config.media.expertNewCard, {
    width: 800, height: 1120, fit: 'crop', quality: 88,
  })) {
    addTarget(targets, {selector: '#expert img', id: content.expert.portrait._id, type: 'media', path: 'asset'});
  }

  const speechLabImageApplied = isAppliedImage(content.speechLab?.image, config.media.expertWork, {
    width: 900, height: 1200, fit: 'crop', quality: 86,
  });
  const expertWorkImageApplied = isAppliedImage(content.expert?.workPhoto, config.media.expertWork, {
    width: 960, height: 1200, fit: 'crop', quality: 86,
  });
  if (speechLabImageApplied) {
    addTarget(targets, {selector: '#speech-lab img', id: content.speechLab.image._id, type: 'media', path: 'asset'});
  } else if (expertWorkImageApplied) {
    addTarget(targets, {selector: '#speech-lab img', id: content.expert.workPhoto._id, type: 'media', path: 'asset'});
  }

  const formTargets = [
    ['namePlaceholder', 'fields.name.placeholder', 'form-name-placeholder'],
    ['contactPlaceholder', 'fields.contact.placeholder', 'form-contact-placeholder'],
    ['messagePlaceholder', 'fields.message.placeholder', 'form-message-placeholder'],
    ['privacyPolicyUrl', null, 'form-policy-link'],
  ];
  formTargets.forEach(([sourceKey, configPath, marker]) => {
    const sourceValue = content.leadFormContent?.[sourceKey];
    const renderedValue = configPath
      ? configPath.split('.').reduce((value, key) => value?.[key], config.form)
      : config.legal.privacyPolicyLink;
    if (sourceValue && (sourceKey === 'privacyPolicyUrl' || isAppliedText(sourceValue, renderedValue))) {
      addTarget(targets, {selector: `[data-preview-target="${marker}"]`, id: 'leadFormContent', type: 'leadFormContent', path: sourceKey});
    }
  });
  const navigationItems = Array.isArray(content.navigation?.items) ? content.navigation.items : [];
  navigationItems.forEach((item) => {
    const rendered = config.navigation.items.find((entry) => entry.key === item._key);
    if (!rendered || !isAppliedText(item.label, rendered.label)) return;
    addTarget(targets, {
      selector: `[data-preview-navigation-key="${item._key}"]`,
      id: 'navigation',
      type: 'navigation',
      path: keyedPath('items', item._key, 'label'),
    });
  });

  const linksPortfolio = content.linksSettings?.portfolio;
  const portfolioSource = linksPortfolio?.isVisible && linksPortfolio.url
    ? {id: 'linksSettings', type: 'linksSettings', path: 'portfolio.url', value: linksPortfolio.url}
    : content.navigation?.portfolioUrl
      ? {id: 'navigation', type: 'navigation', path: 'portfolioUrl', value: content.navigation.portfolioUrl}
      : null;
  if (portfolioSource && isAppliedText(portfolioSource.value, config.links.portfolioDrive)) {
    addTarget(targets, {selector: '[data-preview-portfolio-link]', ...portfolioSource});
  }

  const competencyCards = Array.isArray(content.competencies?.cards) ? content.competencies.cards : [];
  competencyCards.forEach((card) => {
    if (!config.results.cards.some((entry) => entry.key === card.internalKey)) return;
    addTarget(targets, {
      selector: `[data-preview-competency-key="${card.internalKey}"] h3`,
      id: 'competencies',
      type: 'competencies',
      path: keyedPath('cards', card._key, 'title'),
    });
    addTarget(targets, {
      selector: `[data-preview-competency-key="${card.internalKey}"] .card-copy`,
      id: 'competencies',
      type: 'competencies',
      path: keyedPath('cards', card._key, 'description'),
    });
    addTarget(targets, {
      selector: `[data-preview-competency-key="${card.internalKey}"] [data-preview-icon]`,
      id: 'competencies',
      type: 'competencies',
      path: keyedPath('cards', card._key, 'icon'),
    });
  });

  const experienceCards = Array.isArray(content.experience?.cards) ? content.experience.cards : [];
  experienceCards.forEach((card) => {
    if (!config.expert.experienceCards.some((entry) => entry.key === card.internalKey)) return;
    addTarget(targets, {
      selector: `[data-preview-experience-key="${card.internalKey}"] h3`,
      id: 'experience',
      type: 'experience',
      path: keyedPath('cards', card._key, 'label'),
    });
    addTarget(targets, {
      selector: `[data-preview-experience-key="${card.internalKey}"] p`,
      id: 'experience',
      type: 'experience',
      path: keyedPath('cards', card._key, 'text'),
    });
    addTarget(targets, {
      selector: `[data-preview-experience-key="${card.internalKey}"] [data-preview-icon]`,
      id: 'experience',
      type: 'experience',
      path: keyedPath('cards', card._key, 'icon'),
    });
  });

  const transformationItems = Array.isArray(content.transformationSteps?.items)
    ? content.transformationSteps.items
    : [];
  transformationItems.forEach((item) => {
    if (!config.steps.items.some((entry) => entry.key === item.internalKey)) return;
    addTarget(targets, {
      selector: `[data-preview-step-key="${item.internalKey}"] [data-preview-step-number]`,
      id: 'transformationSteps',
      type: 'transformationSteps',
      path: keyedPath('items', item._key, 'number'),
    });
    addTarget(targets, {
      selector: `[data-preview-step-key="${item.internalKey}"] h3`,
      id: 'transformationSteps',
      type: 'transformationSteps',
      path: keyedPath('items', item._key, 'title'),
    });
    addTarget(targets, {
      selector: `[data-preview-step-key="${item.internalKey}"] .card-copy`,
      id: 'transformationSteps',
      type: 'transformationSteps',
      path: keyedPath('items', item._key, 'description'),
    });
  });

  const questions = Array.isArray(content.speechLab?.questions) ? content.speechLab.questions : [];
  questions.forEach((question) => {
    if (!config.speechLab.questions.some((entry) => entry.key === question.internalKey)) return;
    addTarget(targets, {
      selector: `[data-preview-question-prompt="${question.internalKey}"]`,
      id: 'speechLab',
      type: 'speechLab',
      path: keyedPath('questions', question._key, 'prompt'),
    });
    question.options?.forEach((option) => {
      if (!SAFE_KEY_PATTERN.test(question._key || '') || !SAFE_KEY_PATTERN.test(option._key || '')) return;
      addTarget(targets, {
        selector: `[data-preview-question-key="${question.internalKey}"][data-preview-option-key="${option._key}"]`,
        id: 'speechLab',
        type: 'speechLab',
        path: keyedPath('questions', question._key, `options[_key=="${option._key}"].text`),
      });
    });
  });

  const speechResults = Array.isArray(content.speechLab?.results) ? content.speechLab.results : [];
  speechResults.forEach((result) => {
    if (!config.speechLab.results.some((entry) => entry.key === result.internalKey)) return;
    ['title', 'description', 'recommendation'].forEach((field) => {
      addTarget(targets, {
        selector: `[data-preview-result-key="${result.internalKey}"][data-preview-result-field="${field}"]`,
        id: 'speechLab',
        type: 'speechLab',
        path: keyedPath('results', result._key, field),
      });
    });
  });

  const footerLinks = Array.isArray(content.footer?.navigationLinks)
    ? content.footer.navigationLinks
    : [];
  footerLinks.forEach((item) => {
    if (!config.footer.navigationLinks.some((entry) => entry.key === item.internalKey)) return;
    addTarget(targets, {
      selector: `[data-preview-footer-link-key="${item.internalKey}"]`,
      id: 'footer',
      type: 'footer',
      path: keyedPath('navigationLinks', item._key, 'label'),
    });
  });

  const socialFields = {
    telegram: 'telegramChannel',
    vkontakte: 'vkontakte',
    youtube: 'youtube',
    dzen: 'dzen',
  };
  Object.entries(socialFields).forEach(([network, field]) => {
    const link = content.linksSettings?.[field];
    if (!link?.isVisible || !link.url || !config.footer.socialLinks.some((item) => item.network === network)) return;
    addTarget(targets, {
      selector: `[data-preview-social-network="${network}"]`,
      id: 'linksSettings',
      type: 'linksSettings',
      path: `${field}.url`,
    });
  });

  const legalFields = [
    ['ownerFullName', content.legal?.ownerFullName, config.legal.owner],
    ['inn', content.legal?.inn, config.legal.inn],
    ['ogrnip', content.legal?.ogrnip, config.legal.ogrn],
  ];
  legalFields.forEach(([field, source, rendered]) => {
    const sourceText = visibleText(source);
    const renderedText = visibleText(rendered);
    if (!sourceText || !renderedText.includes(sourceText)) return;
    addTarget(targets, {
      selector: `[data-preview-legal-field="${field}"]`,
      id: 'legal',
      type: 'legal',
      path: field,
    });
  });

  return targets;
}
