import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {warnAboutLargeSourceImage} from '../validation.js'

const usageLabels = {
  hero: 'Главное фото первого экрана',
  portrait: 'Фото эксперта',
  section: 'Фотография раздела',
  logo: 'Логотип сайта',
  favicon: 'Иконка сайта',
  og: 'Изображение для социальных сетей',
}

export const media = defineType({
  name: 'media',
  title: 'Изображение',
  type: 'document',
  description: 'Изображение с понятным назначением, описанием для поисковых систем и подтверждением прав.',
  fields: [
    editorialNoticeField,
    defineField({
      name: 'title',
      title: 'Понятное название изображения',
      description: 'Внутреннее название, например «Андрей Чернышев — Hero».',
      type: 'string',
      validation: (Rule) => [
        Rule.required().min(3).error('Укажите понятное название изображения.'),
        Rule.max(100).warning('Название длиннее 100 символов будет неудобно искать в медиатеке.'),
      ],
    }),
    defineField({
      name: 'usage',
      title: 'Назначение',
      description: 'Помогает показывать только подходящие изображения в нужном поле.',
      type: 'string',
      options: {
        list: [
          {title: usageLabels.hero, value: 'hero'},
          {title: usageLabels.portrait, value: 'portrait'},
          {title: usageLabels.section, value: 'section'},
          {title: usageLabels.logo, value: 'logo'},
          {title: usageLabels.favicon, value: 'favicon'},
          {title: usageLabels.og, value: 'og'},
        ],
      },
      validation: (Rule) => Rule.required().error('Выберите назначение изображения.'),
    }),
    defineField({
      name: 'asset',
      title: 'Изображение',
      description: 'JPG, PNG, WebP или AVIF до 8 МБ. Для фотографий настройте фокус кадра.',
      type: 'image',
      options: {
        hotspot: true,
        accept: 'image/jpeg,image/png,image/webp,image/avif',
      },
      validation: (Rule) => [
        Rule.required().error('Загрузите изображение.'),
        Rule.custom(warnAboutLargeSourceImage).warning(),
      ],
    }),
    defineField({
      name: 'alt',
      title: 'Описание фотографии для поисковых систем',
      description: 'Кратко опишите, что изображено. Этот текст также помогает пользователям скринридера.',
      type: 'string',
      validation: (Rule) => [
        Rule.required().min(10).error('Добавьте полезное описание минимум из 10 символов.'),
        Rule.max(180).warning('Описание длиннее 180 символов обычно стоит сократить.'),
      ],
    }),
    defineField({
      name: 'rightsConfirmed',
      title: 'Права на публикацию подтверждены',
      description: 'Включайте только если изображение можно законно использовать на сайте.',
      type: 'boolean',
      initialValue: false,
      validation: (Rule) =>
        Rule.custom((value) => value === true || 'Подтвердите право публикации изображения.'),
    }),
    defineField({
      name: 'notes',
      title: 'Комментарий',
      description: 'Необязательная внутренняя заметка об источнике, кадрировании или замене файла.',
      type: 'text',
      rows: 2,
      validation: (Rule) =>
        Rule.max(300).warning('Комментарий длиннее 300 символов будет неудобно просматривать.'),
    }),
  ],
  preview: {
    select: {title: 'title', usage: 'usage', media: 'asset'},
    prepare: ({title, usage, media: image}) => ({
      title: title || 'Изображение без названия',
      subtitle: usageLabels[usage] || 'Назначение не выбрано',
      media: image,
    }),
  },
})
