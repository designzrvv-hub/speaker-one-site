import {defineArrayMember, defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateStableKey} from '../validation.js'

export const transformationSteps = defineType({
  name: 'transformationSteps',
  title: 'Этапы занятий',
  type: 'document',
  description: 'Заголовок и последовательность этапов работы над речью.',
  fields: [
    editorialNoticeField,
    defineField({name: 'eyebrow', title: 'Верхняя короткая подпись', description: 'Небольшой текст над заголовком раздела.', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'title', title: 'Заголовок раздела', type: 'string', validation: (Rule) => [Rule.required(), Rule.max(120).warning()]}),
    defineField({name: 'description', title: 'Описание раздела', description: 'Необязательный короткий текст.', type: 'text', rows: 3, validation: (Rule) => Rule.max(350).warning()}),
    defineField({name: 'itemLabel', title: 'Подпись перед номером', description: 'Например: «Этап».', type: 'string', validation: (Rule) => Rule.required().max(30)}),
    defineField({
      name: 'items',
      title: 'Этапы',
      type: 'array',
      of: [defineArrayMember({
        name: 'transformationStep',
        title: 'Этап',
        type: 'object',
        fields: [
          defineField({name: 'internalKey', title: 'Служебный ключ', type: 'string', hidden: true, readOnly: true, validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'number', title: 'Номер этапа', description: 'Хранится текстом, поэтому ведущий ноль сохраняется.', type: 'string', validation: (Rule) => Rule.required().max(10)}),
          defineField({name: 'title', title: 'Название этапа', type: 'string', validation: (Rule) => Rule.required().max(100).warning()}),
          defineField({name: 'description', title: 'Простое описание', description: 'Коротко объясните, что происходит на этом этапе.', type: 'text', rows: 4, validation: (Rule) => Rule.required().max(500).warning()}),
          defineField({name: 'order', title: 'Порядок отображения', type: 'number', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
          defineField({name: 'isVisible', title: 'Показывать этот этап на сайте', type: 'boolean', initialValue: true}),
        ],
        preview: {select: {title: 'title', number: 'number'}, prepare: ({title, number}) => ({title: `${number || '—'} — ${title || 'Название не заполнено'}`, subtitle: 'Этап занятий'})},
      })],
      validation: (Rule) => [
        Rule.required().min(1).error('Добавьте хотя бы один этап.'),
        Rule.custom((items = []) => items.filter((item) => item?.isVisible !== false).length >= 3 || 'На сайте будет меньше трёх видимых этапов.').warning(),
        Rule.custom((items = []) => {
          const numbers = items.map((item) => item?.number).filter(Boolean)
          return new Set(numbers).size === numbers.length ? true : 'Номера этапов не должны повторяться.'
        }).warning(),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Этапы занятий', subtitle: 'Порядок работы над речью'})},
})
