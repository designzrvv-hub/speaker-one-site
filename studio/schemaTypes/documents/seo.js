import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateReferencedMediaAlt} from '../validation.js'
import {SeoDescriptionInput, SeoTitleInput} from '../../components/EditorInputs.jsx'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'document',
  description: 'Метаданные поисковой выдачи и карточек сайта в социальных сетях.',
  initialValue: {
    twitterCard: 'summary_large_image',
    allowIndexing: false,
  },
  groups: [
    {name: 'search', title: 'Поисковые системы', default: true},
    {name: 'social', title: 'Социальные сети'},
    {name: 'identity', title: 'Проект и автор'},
  ],
  fields: [
    editorialNoticeField,
    defineField({
      name: 'siteName',
      title: 'Название сайта для поисковых систем',
      description: 'Обычно совпадает с названием Speaker One.',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required().max(60).warning(),
    }),
    defineField({
      name: 'author',
      title: 'Автор сайта',
      description: 'Фактическое имя эксперта без дополнительных регалий.',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'locale',
      title: 'Локаль Open Graph',
      description: 'Для русской версии используется ru_RU.',
      type: 'string',
      group: 'identity',
      options: {list: [{title: 'Русский — Россия', value: 'ru_RU'}]},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Название страницы в поиске',
      description: 'Главный заголовок страницы в Яндексе и Google. Рекомендуемая длина — до 65 символов. Текущую длину Studio показывает под полем.',
      type: 'string',
      group: 'search',
      components: {input: SeoTitleInput},
      validation: (Rule) => [
        Rule.required().min(20).error('Укажите заголовок длиной минимум 20 символов.'),
        Rule.max(65).warning('Поисковая система может обрезать title длиннее 65 символов.'),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Описание страницы в поиске',
      description: 'Короткий текст под заголовком в поисковой выдаче. Рекомендуемая длина — до 165 символов.',
      type: 'text',
      rows: 3,
      group: 'search',
      components: {input: SeoDescriptionInput},
      validation: (Rule) => [
        Rule.required().min(80).error('Укажите описание длиной минимум 80 символов.'),
        Rule.max(165).warning('Поисковая система может обрезать description длиннее 165 символов.'),
      ],
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Основной адрес сайта',
      description:
        'Полный адрес опубликованного сайта, например https://speaker-one.ru. Он должен совпадать с адресом в настройках сайта.',
      type: 'url',
      group: 'search',
      validation: (Rule) =>
        Rule.required()
          .uri({scheme: ['https'], allowRelative: false})
          .error('Укажите полный HTTPS-адрес главной страницы.'),
    }),
    defineField({
      name: 'allowIndexing',
      title: 'Разрешить индексацию',
      description: 'Включайте только после настройки реального домена, ссылок и production-публикации.',
      type: 'boolean',
      group: 'search',
    }),
    defineField({
      name: 'ogTitle',
      title: 'Заголовок ссылки в Telegram и социальных сетях',
      description: 'Заголовок карточки при отправке ссылки в мессенджерах и соцсетях.',
      type: 'string',
      group: 'social',
      validation: (Rule) => [
        Rule.required().min(20).error('Укажите заголовок карточки ссылки.'),
        Rule.max(95).warning('Заголовок длиннее 95 символов может обрезаться в соцсетях.'),
      ],
    }),
    defineField({
      name: 'ogDescription',
      title: 'Описание ссылки в Telegram и социальных сетях',
      description: 'Короткое описание карточки ссылки.',
      type: 'text',
      rows: 3,
      group: 'social',
      validation: (Rule) => [
        Rule.required().min(50).error('Укажите описание карточки ссылки.'),
        Rule.max(200).warning('Описание длиннее 200 символов может обрезаться.'),
      ],
    }),
    defineField({
      name: 'ogImage',
      title: 'Изображение для социальных сетей',
      description: 'Показывается при отправке ссылки в Telegram, VK и других сервисах. Рекомендуемый размер — 1200 × 630 px.',
      type: 'reference',
      to: [{type: 'media'}],
      group: 'social',
      options: {filter: 'usage == "og"'},
      validation: (Rule) => [
        Rule.required().error('Выберите изображение карточки ссылки.'),
        Rule.custom(validateReferencedMediaAlt),
      ],
    }),
    defineField({
      name: 'twitterCard',
      title: 'Размер карточки в X / Twitter',
      description: 'На первом этапе используется большая карточка с изображением.',
      type: 'string',
      group: 'social',
      readOnly: true,
      options: {list: [{title: 'Большая карточка', value: 'summary_large_image'}]},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Прежние ссылки для поисковых систем',
      description: 'Теперь публичные ссылки редактируются в едином разделе «Социальные сети и Telegram».',
      type: 'array',
      group: 'social',
      of: [{type: 'socialLink'}],
      hidden: true,
      readOnly: true,
      validation: (Rule) => Rule.max(8),
    }),
  ],
  preview: {
    select: {subtitle: 'title'},
    prepare: ({subtitle}) => ({title: 'SEO — поиск и карточки ссылок', subtitle}),
  },
})
