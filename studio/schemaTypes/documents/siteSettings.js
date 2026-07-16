import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateReferencedMediaAlt} from '../validation.js'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Общие настройки сайта',
  type: 'document',
  description: 'Название проекта, основной адрес сайта, логотипы, контакт и социальные ссылки.',
  initialValue: {
    language: 'ru',
    locale: 'ru_RU',
    timezone: 'Asia/Yekaterinburg',
  },
  groups: [
    {name: 'main', title: 'Основное', default: true},
    {name: 'brand', title: 'Логотипы'},
    {name: 'contacts', title: 'Публичные контакты'},
  ],
  fields: [
    editorialNoticeField,
    defineField({
      name: 'siteName',
      title: 'Название проекта',
      description: 'Название бренда, которое используется на сайте и в SEO.',
      type: 'string',
      group: 'main',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите название проекта минимум из 2 символов.'),
        Rule.max(60).warning('Название длиннее 60 символов может плохо выглядеть в интерфейсе.'),
      ],
    }),
    defineField({
      name: 'siteUrl',
      title: 'Основной адрес сайта',
      description: 'Полный адрес опубликованного сайта без пути, например https://speaker-one.ru.',
      type: 'url',
      group: 'main',
      validation: (Rule) =>
        Rule.required()
          .uri({scheme: ['https'], allowRelative: false})
          .error('Укажите полный HTTPS-адрес сайта, например https://speaker-one.ru.'),
    }),
    defineField({
      name: 'language',
      title: 'Язык сайта',
      description: 'На первом этапе сайт работает только на русском языке.',
      type: 'string',
      group: 'main',
      readOnly: true,
      options: {list: [{title: 'Русский', value: 'ru'}]},
      validation: (Rule) => Rule.required().error('Выберите язык сайта.'),
    }),
    defineField({
      name: 'locale',
      title: 'Регион языка',
      description: 'Используется для корректного отображения русского языка в карточках ссылок.',
      type: 'string',
      group: 'main',
      readOnly: true,
      options: {list: [{title: 'Русский — Россия', value: 'ru_RU'}]},
      validation: (Rule) => Rule.required().error('Выберите локаль сайта.'),
    }),
    defineField({
      name: 'timezone',
      title: 'Часовой пояс',
      description: 'Используется в служебных датах и заявках. Изменяйте только при переезде проекта в другой регион.',
      type: 'string',
      group: 'main',
      options: {
        list: [
          {title: 'Екатеринбург — UTC+5', value: 'Asia/Yekaterinburg'},
          {title: 'Москва — UTC+3', value: 'Europe/Moscow'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'copyright',
      title: 'Текст копирайта',
      description: 'Название после года в нижней части сайта.',
      type: 'string',
      group: 'main',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'logoFull',
      title: 'Полный логотип',
      description: 'Основной логотип Speaker One. Сначала добавьте файл в раздел «Изображения».',
      type: 'reference',
      to: [{type: 'media'}],
      group: 'brand',
      options: {filter: 'usage == "logo"'},
      validation: (Rule) => [
        Rule.required().error('Выберите полный логотип.'),
        Rule.custom(validateReferencedMediaAlt),
      ],
    }),
    defineField({
      name: 'logoMark',
      title: 'Знак логотипа',
      description: 'Компактный знак S1 для навигации и небольших форматов.',
      type: 'reference',
      to: [{type: 'media'}],
      group: 'brand',
      options: {filter: 'usage == "logo"'},
      validation: (Rule) => [
        Rule.required().error('Выберите знак логотипа.'),
        Rule.custom(validateReferencedMediaAlt),
      ],
    }),
    defineField({
      name: 'favicon',
      title: 'Иконка сайта',
      description: 'Квадратное изображение для вкладки браузера.',
      type: 'reference',
      to: [{type: 'media'}],
      group: 'brand',
      options: {filter: 'usage == "favicon"'},
      validation: (Rule) => [
        Rule.required().error('Выберите favicon.'),
        Rule.custom(validateReferencedMediaAlt),
      ],
    }),
    defineField({
      name: 'primaryContact',
      title: 'Дополнительный публичный контакт',
      description: 'Необязательная рабочая ссылка. Основные Telegram-ссылки находятся в отдельном понятном разделе.',
      type: 'string',
      group: 'contacts',
      validation: (Rule) => Rule.custom((value) => {
        if (!value) return true
        try {
          return new URL(value).protocol === 'https:' ? true : 'Используйте полный HTTPS-адрес.'
        } catch {
          return 'Укажите корректную ссылку.'
        }
      }),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Прежние социальные ссылки',
      description: 'Теперь ссылки редактируются в разделе «Социальные сети и Telegram».',
      type: 'array',
      group: 'contacts',
      of: [{type: 'socialLink'}],
      hidden: true,
      readOnly: true,
      validation: (Rule) => [
        Rule.max(8).warning('Большое количество ссылок перегружает навигацию и подвал.'),
        Rule.custom((items = []) => {
          const networks = items.map((item) => item?.network).filter(Boolean)
          return new Set(networks).size === networks.length
            ? true
            : 'Одна и та же площадка добавлена несколько раз.'
        }).warning(),
      ],
    }),
  ],
  preview: {
    select: {subtitle: 'siteUrl'},
    prepare: ({subtitle}) => ({title: 'Настройки сайта', subtitle: subtitle || 'Основной домен не указан'}),
  },
})
