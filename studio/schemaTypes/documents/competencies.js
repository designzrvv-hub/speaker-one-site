import {defineArrayMember, defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {safeIconOptions, validateStableKey} from '../validation.js'

export const competencies = defineType({
  name: 'competencies',
  title: 'Компетенции',
  type: 'document',
  description: 'Заголовок и карточки раздела с результатами обучения.',
  fields: [
    editorialNoticeField,
    defineField({name: 'eyebrow', title: 'Верхняя короткая подпись', description: 'Небольшой текст над заголовком раздела.', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'title', title: 'Заголовок раздела', type: 'string', validation: (Rule) => [Rule.required(), Rule.max(120).warning('Проверьте переносы длинного заголовка.')]}),
    defineField({name: 'description', title: 'Описание раздела', description: 'Необязательный короткий текст под заголовком.', type: 'text', rows: 3, validation: (Rule) => Rule.max(350).warning()}),
    defineField({
      name: 'cards',
      title: 'Карточки результатов',
      description: 'Карточки сортируются по полю «Порядок». Скрытые карточки не появляются на сайте.',
      type: 'array',
      of: [defineArrayMember({
        name: 'competencyCard',
        title: 'Карточка компетенции',
        type: 'object',
        fields: [
          defineField({name: 'internalKey', title: 'Служебный ключ', type: 'string', hidden: true, readOnly: true, validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'title', title: 'Название карточки', type: 'string', validation: (Rule) => Rule.required().max(100).warning()}),
          defineField({name: 'description', title: 'Что получит человек', description: 'Опишите понятный результат без абсолютных обещаний.', type: 'text', rows: 4, validation: (Rule) => Rule.required().max(500).warning()}),
          defineField({name: 'additionalLabels', title: 'Дополнительные подписи', description: 'Короткие результаты или пояснения в нижней части карточки.', type: 'array', of: [{type: 'string'}], validation: (Rule) => Rule.max(4).warning('Больше четырёх подписей перегрузят карточку.')}),
          defineField({name: 'icon', title: 'Иконка', description: 'Можно выбрать только иконку из безопасного списка.', type: 'string', options: {list: safeIconOptions}, validation: (Rule) => Rule.required()}),
          defineField({name: 'order', title: 'Порядок отображения', type: 'number', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
          defineField({name: 'isVisible', title: 'Показывать эту карточку на сайте', type: 'boolean', initialValue: true}),
        ],
        preview: {
          select: {title: 'title', subtitle: 'description'},
          prepare: ({title, subtitle}) => ({title: title || 'Карточка результата', subtitle}),
        },
      })],
      validation: (Rule) => [
        Rule.required().min(1).error('Добавьте хотя бы одну карточку.'),
        Rule.custom((items = []) => {
          const keys = items.map((item) => item?.internalKey).filter(Boolean)
          return new Set(keys).size === keys.length ? true : 'Стабильные ключи карточек не должны повторяться.'
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Компетенции', subtitle: 'Карточки результатов обучения'})},
})
