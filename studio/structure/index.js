import {LeadStatusPanel} from '../dashboard/OwnerDashboard.jsx'

export const singletonTypes = new Set([
  'siteSettings',
  'linksSettings',
  'hero',
  'navigation',
  'seo',
  'legal',
  'manifesto',
  'competencies',
  'expert',
  'experience',
  'transformationSteps',
  'speechLab',
  'leadFormContent',
  'footer',
])

export const singletonActions = new Set(['publish', 'discardChanges', 'restore'])

function documentItem(S, {type, id = type, title}) {
  return S.listItem()
    .id(id)
    .title(title)
    .child(S.document().schemaType(type).documentId(type).title(title))
}

function documentList(S, title, items) {
  return S.listItem()
    .title(title)
    .child(S.list().title(title).items(items.map((item) => documentItem(S, item))))
}

function mediaList(S, {id, title, usage}) {
  const filter = usage ? '_type == "media" && usage == $usage' : '_type == "media"'

  return S.listItem()
    .id(id)
    .title(title)
    .child(
      S.documentTypeList('media')
        .title(title)
        .filter(filter)
        .params(usage ? {usage} : {}),
    )
}

export const studioStructure = (S) =>
  S.list()
    .title('Резервное меню')
    .items([
      documentList(S, 'Все разделы сайта', [
        {type: 'hero', title: 'Первый экран'},
        {type: 'manifesto', title: 'Философия'},
        {type: 'competencies', title: 'Компетенции'},
        {type: 'expert', title: 'Обо мне'},
        {type: 'experience', title: 'Опыт и факты'},
        {type: 'transformationSteps', title: 'Этапы занятий'},
        {type: 'speechLab', title: 'Speech Lab'},
        {type: 'leadFormContent', title: 'Форма консультации'},
        {type: 'footer', title: 'Подвал сайта'},
      ]),

      S.listItem()
        .title('TELEGRAM И ЗАЯВКИ')
        .child(S.list().title('Telegram и заявки').items([
          documentItem(S, {type: 'linksSettings', title: 'Публичные ссылки Telegram'}),
          documentItem(S, {type: 'leadFormContent', title: 'Тексты формы'}),
          S.listItem().id('lead-status').title('Состояние приёма заявок').child(S.component(LeadStatusPanel).title('Заявки с сайта')),
        ])),

      S.listItem()
        .title('Медиа')
        .child(S.list().title('Изображения сайта').items([
          mediaList(S, {id: 'media-logo', title: 'Логотип сайта', usage: 'logo'}),
          mediaList(S, {id: 'media-hero', title: 'Главное фото первого экрана', usage: 'hero'}),
          mediaList(S, {id: 'media-portrait', title: 'Фотографии эксперта', usage: 'portrait'}),
          mediaList(S, {id: 'media-section', title: 'Фотографии разделов', usage: 'section'}),
          mediaList(S, {id: 'media-og', title: 'Изображение для социальных сетей', usage: 'og'}),
          mediaList(S, {id: 'media-favicon', title: 'Иконка сайта', usage: 'favicon'}),
          S.divider(),
          mediaList(S, {id: 'media-all', title: 'Все изображения'}),
        ])),

      S.listItem()
        .title('SEO')
        .child(S.document().schemaType('seo').documentId('seo').title('SEO')),

      S.listItem()
        .title('Юридические данные')
        .child(S.document().schemaType('legal').documentId('legal').title('Юридические данные')),

      S.listItem()
        .title('Настройки')
        .child(S.list().title('Настройки сайта').items([
          documentItem(S, {type: 'siteSettings', title: 'Название, домен и язык'}),
          documentItem(S, {type: 'navigation', title: 'Навигация'}),
          documentItem(S, {type: 'footer', title: 'Подвал сайта'}),
        ])),
    ])
