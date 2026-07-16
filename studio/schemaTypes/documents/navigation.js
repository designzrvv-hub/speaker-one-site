import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'

export const navigation = defineType({
  name: 'navigation',
  title: 'Навигация',
  type: 'document',
  description: 'Видимые подписи верхнего меню, портфолио и кнопка консультации.',
  initialValue: {
    consultationAction: 'scrollToForm',
  },
  groups: [
    {name: 'menu', title: 'Пункты меню', default: true},
    {name: 'portfolio', title: 'Портфолио'},
    {name: 'button', title: 'Кнопка консультации'},
  ],
  fields: [
    editorialNoticeField,
    defineField({
      name: 'items',
      title: 'Пункты меню',
      description:
        'Можно менять подпись, ссылку, видимость и порядок пунктов. Сами секции сайта не переставляются.',
      type: 'array',
      group: 'menu',
      of: [{type: 'navigationItem'}],
      validation: (Rule) => [
        Rule.required().min(1).error('Добавьте хотя бы один пункт меню.'),
        Rule.max(8).warning('Больше восьми пунктов могут не поместиться в верхнем меню.'),
        Rule.custom((items = []) => {
            const anchors = items.map((item) => item?.href).filter(Boolean)
            return new Set(anchors).size === anchors.length
              ? true
              : 'Один раздел добавлен в меню несколько раз.'
          }).warning(),
      ],
    }),
    defineField({
      name: 'portfolioLabel',
      title: 'Подпись ссылки на портфолио',
      description: 'Короткий текст внешней ссылки в верхнем меню.',
      type: 'string',
      group: 'portfolio',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите подпись ссылки на портфолио.'),
        Rule.max(40).warning('Длинная подпись может не поместиться в верхнем меню.'),
      ],
    }),
    defineField({
      name: 'portfolioUrl',
      title: 'Ссылка на портфолио',
      description: 'Полный рабочий HTTPS-адрес портфолио.',
      type: 'url',
      group: 'portfolio',
      validation: (Rule) =>
        Rule.required()
          .uri({scheme: ['https'], allowRelative: false})
          .error('Укажите полный рабочий HTTPS-адрес портфолио.'),
    }),
    defineField({
      name: 'consultationLabel',
      title: 'Текст кнопки консультации',
      description: 'Кнопка продолжает прокручивать к существующей форме. Меняется только видимая подпись.',
      type: 'string',
      group: 'button',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите текст кнопки консультации.'),
        Rule.max(60).warning('Длинный текст кнопки нужно проверить на ширине 320 px.'),
      ],
    }),
    defineField({
      name: 'consultationAction',
      title: 'Прежнее действие кнопки',
      type: 'string',
      group: 'button',
      initialValue: 'scrollToForm',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'consultationButtonAction',
      title: 'Что должна делать кнопка консультации?',
      description: 'Обычно эта кнопка ведёт к форме консультации.',
      type: 'buttonAction',
      group: 'button',
      validation: (Rule) => Rule.required().error('Выберите действие кнопки.'),
    }),
  ],
  preview: {
    prepare: () => ({title: 'Навигация', subtitle: 'Меню и верхняя кнопка'}),
  },
})
