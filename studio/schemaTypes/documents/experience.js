import {defineArrayMember, defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {safeIconOptions, validateStableKey} from '../validation.js'

export const experience = defineType({
  name: 'experience',
  title: 'Опыт и факты',
  type: 'document',
  description: 'Проверяемые факты и три карточки опыта, которые показаны в разделе «Обо мне».',
  groups: [
    {name: 'facts', title: 'Факты', default: true},
    {name: 'cards', title: 'Карточки опыта'},
  ],
  fields: [
    editorialNoticeField,
    defineField({
      name: 'factsTitle',
      title: 'Заголовок списка фактов',
      description: 'Например: «Опыт и факты».',
      type: 'string',
      group: 'facts',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'facts',
      title: 'Факты и регалии',
      description: 'Добавляйте только подтверждённые факты и цифры.',
      type: 'array',
      group: 'facts',
      of: [{type: 'string'}],
      validation: (Rule) => Rule.required().min(1).max(8),
    }),
    defineField({
      name: 'cards',
      title: 'Карточки опыта',
      type: 'array',
      group: 'cards',
      of: [defineArrayMember({
        name: 'experienceCard',
        title: 'Карточка опыта',
        type: 'object',
        fields: [
          defineField({name: 'internalKey', title: 'Служебный ключ', type: 'string', hidden: true, readOnly: true, validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'label', title: 'Категория', description: 'Короткая метка, например «ПРАКТИКА».', type: 'string', validation: (Rule) => Rule.required().max(40)}),
          defineField({name: 'text', title: 'Основной факт', type: 'text', rows: 3, validation: (Rule) => Rule.required().max(300).warning()}),
          defineField({name: 'icon', title: 'Иконка', description: 'Выберите подходящий знак из готового списка.', type: 'string', options: {list: safeIconOptions}, validation: (Rule) => Rule.required()}),
          defineField({name: 'order', title: 'Порядок отображения', type: 'number', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
          defineField({name: 'isVisible', title: 'Показывать эту карточку на сайте', type: 'boolean', initialValue: true}),
        ],
        preview: {
          select: {title: 'label', subtitle: 'text'},
          prepare: ({title, subtitle}) => ({title: title || 'Карточка опыта', subtitle}),
        },
      })],
      validation: (Rule) => Rule.required().min(1).max(6),
    }),
  ],
  preview: {prepare: () => ({title: 'Опыт и факты', subtitle: 'Факты и карточки опыта'})},
})
