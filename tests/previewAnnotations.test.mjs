import assert from 'node:assert/strict';
import test from 'node:test';
import {createPreviewAnnotationTargets} from '../src/services/previewContentLoader.js';

test('preview annotations preserve exact keyed Sanity paths', () => {
  const content = {
    navigation: {
      items: [{_key: 'navigation-1', label: 'Философия'}],
    },
    linksSettings: {
      portfolio: {url: 'https://example.com/portfolio', isVisible: true},
      telegramChannel: {url: 'https://t.me/speaker_one', isVisible: true},
    },
    competencies: {
      cards: [{_key: 'competency-1', internalKey: 'confidence'}],
    },
    experience: {
      cards: [{_key: 'experience-1', internalKey: 'practice'}],
    },
    transformationSteps: {
      items: [{_key: 'step-1', internalKey: 'confidence'}],
    },
    speechLab: {
      questions: [{
        _key: 'question-1',
        internalKey: 'meeting',
        options: [{_key: 'answer-1', text: 'Беру короткую паузу'}],
      }],
    },
    leadFormContent: {
      namePlaceholder: 'Андрей',
      privacyPolicyUrl: '/privacy-policy.html',
    },
    legal: {
      ownerFullName: 'Чернышев Андрей Александрович',
      inn: '744919295232',
      ogrnip: '326745600003638',
    },
  };

  const config = {
    media: {},
    navigation: {
      items: [{key: 'navigation-1', label: 'Философия'}],
    },
    links: {portfolioDrive: 'https://example.com/portfolio'},
    results: {cards: [{key: 'confidence'}]},
    expert: {experienceCards: [{key: 'practice'}]},
    steps: {items: [{key: 'confidence'}]},
    speechLab: {
      questions: [{key: 'meeting', options: [{key: 'answer-1', text: 'Беру короткую паузу'}]}],
    },
    form: {
      fields: {
        name: {placeholder: 'Андрей'},
        contact: {placeholder: ''},
        message: {placeholder: ''},
      },
    },
    legal: {
      owner: 'Индивидуальный предприниматель Чернышев Андрей Александрович',
      inn: 'ИНН 744919295232',
      ogrn: 'ОГРНИП 326745600003638',
      privacyPolicyLink: '/privacy-policy.html',
    },
    footer: {
      socialLinks: [{network: 'telegram'}],
    },
  };

  const targets = createPreviewAnnotationTargets(content, config);
  const paths = new Set(targets.map(({id, path}) => `${id}:${path}`));

  assert.ok(paths.has('navigation:items[_key=="navigation-1"].label'));
  assert.ok(paths.has('linksSettings:portfolio.url'));
  assert.ok(paths.has('competencies:cards[_key=="competency-1"].icon'));
  assert.ok(paths.has('competencies:cards[_key=="competency-1"].title'));
  assert.ok(paths.has('competencies:cards[_key=="competency-1"].description'));
  assert.ok(paths.has('experience:cards[_key=="experience-1"].icon'));
  assert.ok(paths.has('experience:cards[_key=="experience-1"].label'));
  assert.ok(paths.has('experience:cards[_key=="experience-1"].text'));
  assert.ok(paths.has('transformationSteps:items[_key=="step-1"].number'));
  assert.ok(paths.has('transformationSteps:items[_key=="step-1"].title'));
  assert.ok(paths.has('transformationSteps:items[_key=="step-1"].description'));
  assert.ok(paths.has('speechLab:questions[_key=="question-1"].prompt'));
  assert.ok(paths.has('speechLab:questions[_key=="question-1"].options[_key=="answer-1"].text'));
  assert.ok(paths.has('leadFormContent:namePlaceholder'));
  assert.ok(paths.has('leadFormContent:privacyPolicyUrl'));
  assert.ok(paths.has('legal:ownerFullName'));
  assert.ok(paths.has('legal:inn'));
  assert.ok(paths.has('legal:ogrnip'));
  assert.ok(paths.has('linksSettings:telegramChannel.url'));
});

test('fallback content receives no editing annotations', () => {
  assert.deepEqual(createPreviewAnnotationTargets(null, {}), []);
  assert.deepEqual(createPreviewAnnotationTargets({}, null), []);
});
