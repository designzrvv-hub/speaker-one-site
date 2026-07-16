import {defineArrayMember, defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateReferencedMediaAlt, validateSafePublicUrl, validateStableKey} from '../validation.js'

export const expert = defineType({
  name: 'expert',
  title: 'Обо мне',
  type: 'document',
  description: 'Публичная информация об Андрее Чернышеве, факты, фотографии и карточки опыта.',
  groups: [
    {name: 'main', title: 'Основное', default: true},
    {name: 'audience', title: 'Для кого подходит'},
    {name: 'media', title: 'Фотографии'},
    {name: 'cta', title: 'Кнопка'},
  ],
  fields: [
    editorialNoticeField,
    defineField({name: 'eyebrow', title: 'Верхняя короткая подпись', description: 'Небольшой текст над именем.', type: 'string', group: 'main', validation: (Rule) => Rule.required()}),
    defineField({name: 'name', title: 'Имя эксперта', type: 'string', group: 'main', validation: (Rule) => Rule.required().min(2).max(100)}),
    defineField({name: 'role', title: 'Профессиональная роль', type: 'string', group: 'main', validation: (Rule) => [Rule.required(), Rule.max(180).warning('Проверьте длинную роль на мобильном экране.')]}),
    defineField({name: 'founderStatus', title: 'Статус основателя', description: 'Например: «Основатель Speaker One».', type: 'string', group: 'main', validation: (Rule) => Rule.required().max(100).warning()}),
    defineField({name: 'description', title: 'Краткое описание', description: 'Этот абзац показывается только когда заполнен.', type: 'text', rows: 3, group: 'main', validation: (Rule) => Rule.max(450).warning()}),
    defineField({name: 'credentialsTitle', title: 'Прежний заголовок фактов', type: 'string', hidden: true, readOnly: true}),
    defineField({name: 'facts', title: 'Прежний список фактов', type: 'array', of: [{type: 'string'}], hidden: true, readOnly: true}),
    defineField({name: 'audienceTitle', title: 'Заголовок блока', description: 'Например: «Кому подойдёт обучение».', type: 'string', group: 'audience', validation: (Rule) => Rule.required()}),
    defineField({name: 'audienceDescription', title: 'Для кого подходит работа', type: 'text', rows: 4, group: 'audience', validation: (Rule) => [Rule.required(), Rule.max(600).warning()]}),
    defineField({
      name: 'experienceCards',
      title: 'Прежние карточки опыта',
      type: 'array',
      hidden: true,
      readOnly: true,
      of: [defineArrayMember({
        name: 'experienceCard',
        title: 'Карточка опыта',
        type: 'object',
        fields: [
          defineField({name: 'internalKey', title: 'Стабильный ключ карточки', description: 'Не меняйте после публикации.', type: 'string', validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'label', title: 'Метка карточки', type: 'string', validation: (Rule) => Rule.required().max(40)}),
          defineField({name: 'text', title: 'Текст карточки', type: 'text', rows: 3, validation: (Rule) => Rule.required().max(300).warning()}),
          defineField({name: 'icon', title: 'Иконка', type: 'string'}),
          defineField({name: 'order', title: 'Порядок карточки', type: 'number', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
          defineField({name: 'isVisible', title: 'Показывать карточку', type: 'boolean', initialValue: true}),
        ],
        preview: {select: {title: 'label', subtitle: 'text'}},
      })],
    }),
    defineField({name: 'portrait', title: 'Основное фото эксперта', description: 'Портрет в разделе «Обо мне».', type: 'reference', to: [{type: 'media'}], group: 'media', options: {filter: 'usage == "portrait"'}, validation: (Rule) => [Rule.required(), Rule.custom(validateReferencedMediaAlt)]}),
    defineField({name: 'workPhoto', title: 'Дополнительное фото эксперта', description: 'Используется в Speech Lab, если там не выбрано отдельное изображение.', type: 'reference', to: [{type: 'media'}], group: 'media', options: {filter: 'usage in ["section", "portrait"]'}, validation: (Rule) => Rule.custom(validateReferencedMediaAlt)}),
    defineField({name: 'ctaLabel', title: 'Текст на кнопке', type: 'string', group: 'cta', validation: (Rule) => Rule.required().max(60).warning()}),
    defineField({name: 'telegramUrl', title: 'Прежняя ссылка Telegram', type: 'string', group: 'cta', hidden: true, readOnly: true, validation: (Rule) => Rule.custom((value) => !value || validateSafePublicUrl(value))}),
    defineField({name: 'buttonAction', title: 'Что должна делать кнопка?', description: 'Ссылка Telegram берётся из общего раздела «Социальные сети и Telegram».', type: 'buttonAction', group: 'cta', validation: (Rule) => Rule.required()}),
  ],
  preview: {select: {subtitle: 'name'}, prepare: ({subtitle}) => ({title: `Обо мне — ${subtitle || 'имя не заполнено'}`, subtitle: 'Информация об эксперте'})},
})
