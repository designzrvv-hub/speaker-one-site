import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateSafePublicUrl} from '../validation.js'

const requiredString = (Rule) => Rule.required().min(1)

export const leadFormContent = defineType({
  name: 'leadFormContent',
  title: 'Форма консультации',
  type: 'document',
  description: 'Только публичные тексты и безопасные ограничения формы. Endpoint и токены здесь не хранятся.',
  groups: [
    {name: 'intro', title: 'Заголовок', default: true},
    {name: 'fields', title: 'Поля'},
    {name: 'messages', title: 'Сообщения'},
    {name: 'legal', title: 'Согласие и ссылки'},
    {name: 'service', title: 'Служебные ограничения'},
  ],
  fields: [
    editorialNoticeField,
    defineField({name: 'eyebrow', title: 'Верхняя подпись', type: 'string', group: 'intro', validation: requiredString}),
    defineField({name: 'title', title: 'Заголовок формы', type: 'string', group: 'intro', validation: requiredString}),
    defineField({name: 'description', title: 'Описание следующего шага', type: 'text', rows: 3, group: 'intro', validation: requiredString}),
    defineField({name: 'nameLabel', title: 'Подпись поля имени', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'namePlaceholder', title: 'Пример в поле имени', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'nameHint', title: 'Подсказка для поля имени', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'nameMin', title: 'Минимальная длина имени', description: 'Служебная защита формы. Не изменяйте без необходимости.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(2).max(80)}),
    defineField({name: 'nameMax', title: 'Максимальная длина имени', description: 'Служебная защита формы. Не больше 80 символов.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(2).max(80)}),
    defineField({name: 'contactLabel', title: 'Подпись поля контакта', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'contactPlaceholder', title: 'Пример в поле контакта', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'contactHint', title: 'Подсказка для поля контакта', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'contactMin', title: 'Минимальная длина контакта', description: 'Служебная защита формы. Не изменяйте без необходимости.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(3).max(120)}),
    defineField({name: 'contactMax', title: 'Максимальная длина контакта', description: 'Служебная защита формы. Не больше 120 символов.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(3).max(120)}),
    defineField({name: 'messageLabel', title: 'Подпись поля задачи', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'messagePlaceholder', title: 'Пример в поле задачи', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'messageHint', title: 'Подсказка для поля задачи', type: 'string', group: 'fields', validation: requiredString}),
    defineField({name: 'messageMin', title: 'Минимальная длина задачи', description: 'Служебная защита формы. Не изменяйте без необходимости.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(5).max(1000)}),
    defineField({name: 'messageMax', title: 'Максимальная длина задачи', description: 'Служебная защита формы. Не больше 1000 символов.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(5).max(1000)}),
    defineField({name: 'submitLabel', title: 'Текст кнопки отправки', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'submittingLabel', title: 'Текст во время отправки', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'telegramLabel', title: 'Текст кнопки Telegram', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'fallbackButtonAction', title: 'Что должна делать резервная кнопка?', description: 'Обычно открывает основной Telegram. Ссылка хранится в общем разделе Telegram.', type: 'buttonAction', group: 'messages', validation: (Rule) => Rule.required()}),
    defineField({name: 'idleMessage', title: 'Сообщение до отправки', description: 'Необязательный текст; сейчас интерфейс его не показывает.', type: 'string', group: 'messages'}),
    defineField({name: 'successMessage', title: 'Сообщение об успешной отправке', type: 'text', rows: 3, group: 'messages', validation: requiredString}),
    defineField({name: 'errorMessage', title: 'Сообщение об ошибке', type: 'text', rows: 3, group: 'messages', validation: requiredString}),
    defineField({name: 'unavailableMessage', title: 'Сообщение, если отправка не настроена', type: 'text', rows: 3, group: 'messages', validation: requiredString}),
    defineField({name: 'validationMessage', title: 'Общее сообщение о проверке полей', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'nameRequiredMessage', title: 'Ошибка: имя не указано', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'nameLengthMessage', title: 'Ошибка: длина имени', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'contactRequiredMessage', title: 'Ошибка: контакт не указан', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'contactLengthMessage', title: 'Ошибка: длина контакта', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'messageRequiredMessage', title: 'Ошибка: задача не указана', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'messageLengthMessage', title: 'Ошибка: длина задачи', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'consentRequiredMessage', title: 'Ошибка: нет согласия', type: 'string', group: 'messages', validation: requiredString}),
    defineField({name: 'legalPrefix', title: 'Текст согласия до ссылки', type: 'string', group: 'legal', validation: requiredString}),
    defineField({name: 'legalLinkLabel', title: 'Подпись ссылки на политику', type: 'string', group: 'legal', validation: requiredString}),
    defineField({name: 'legalSuffix', title: 'Текст после ссылки', description: 'Обычно это точка.', type: 'string', group: 'legal', validation: requiredString}),
    defineField({name: 'privacyPolicyUrl', title: 'Ссылка на политику конфиденциальности', type: 'string', group: 'legal', validation: (Rule) => Rule.required().custom(validateSafePublicUrl)}),
    defineField({name: 'publicTelegramUrl', title: 'Прежняя публичная ссылка Telegram', type: 'string', group: 'legal', hidden: true, readOnly: true, validation: (Rule) => Rule.custom((value) => !value || validateSafePublicUrl(value))}),
  ],
  validation: (Rule) => Rule.custom((document) => {
    const pairs = [
      ['имени', document?.nameMin, document?.nameMax],
      ['контакта', document?.contactMin, document?.contactMax],
      ['задачи', document?.messageMin, document?.messageMax],
    ]
    const invalid = pairs.find(([, min, max]) => Number.isFinite(min) && Number.isFinite(max) && min > max)
    return invalid ? `Минимальная длина ${invalid[0]} не может быть больше максимальной.` : true
  }),
  preview: {prepare: () => ({title: 'Форма консультации', subtitle: 'Поля, сообщения и согласие'})},
})
