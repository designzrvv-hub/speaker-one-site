import {defineArrayMember, defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateSafePublicUrl, validateStableKey} from '../validation.js'

export const footer = defineType({
  name: 'footer',
  title: 'Подвал сайта',
  type: 'document',
  description: 'Описание бренда, ссылки и копирайт. Юридические данные редактируются в отдельном разделе.',
  fields: [
    editorialNoticeField,
    defineField({name: 'brandName', title: 'Название бренда', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'description', title: 'Описание Speaker One', type: 'text', rows: 4, validation: (Rule) => [Rule.required(), Rule.max(500).warning()]}),
    defineField({name: 'navigationTitle', title: 'Заголовок навигации', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'navigationLinks',
      title: 'Ссылки в подвале',
      type: 'array',
      of: [defineArrayMember({
        name: 'footerNavigationLink',
        title: 'Ссылка',
        type: 'object',
        fields: [
          defineField({name: 'internalKey', title: 'Служебный ключ', type: 'string', hidden: true, readOnly: true, validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'label', title: 'Подпись ссылки', type: 'string', validation: (Rule) => Rule.required()}),
          defineField({name: 'href', title: 'Прежний адрес ссылки', type: 'string', hidden: true, readOnly: true, validation: (Rule) => Rule.custom((value) => {
            if (!value || ['portfolio', 'privacy'].includes(value)) return true
            return validateSafePublicUrl(value)
          })}),
          defineField({name: 'action', title: 'Куда должна вести ссылка?', type: 'buttonAction', validation: (Rule) => Rule.required()}),
          defineField({name: 'order', title: 'Порядок отображения', type: 'number', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
          defineField({name: 'isVisible', title: 'Показывать эту ссылку на сайте', type: 'boolean', initialValue: true}),
        ],
        preview: {select: {title: 'label'}, prepare: ({title}) => ({title: title || 'Ссылка подвала', subtitle: 'Настроенное действие'})},
      })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({name: 'socialTitle', title: 'Заголовок социальных ссылок', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'socialLinks', title: 'Прежние социальные ссылки', description: 'Теперь ссылки редактируются в едином разделе «Социальные сети и Telegram».', type: 'array', of: [{type: 'socialLink'}], hidden: true, readOnly: true, validation: (Rule) => Rule.max(8)}),
    defineField({name: 'copyright', title: 'Текст копирайта после года', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'statusText', title: 'Короткая подпись внизу', type: 'string', validation: (Rule) => Rule.required().max(100).warning()}),
  ],
  preview: {prepare: () => ({title: 'Подвал сайта', subtitle: 'Описание, ссылки и копирайт'})},
})
