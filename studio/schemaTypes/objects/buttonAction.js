import {defineField, defineType} from 'sanity'
import {validateSafePublicUrl} from '../validation.js'

const actionLabels = {
  form: 'Перейти к форме консультации',
  telegram: 'Открыть основной Telegram',
  telegramBot: 'Открыть Telegram-бота',
  telegramChannel: 'Открыть Telegram-канал',
  section: 'Перейти к разделу сайта',
  external: 'Открыть внешнюю ссылку',
  hidden: 'Не показывать кнопку',
}

const sectionLabels = {
  firstScreen: 'Первый экран',
  philosophy: 'Философия',
  competencies: 'Компетенции',
  expert: 'Обо мне',
  speechLab: 'Speech Lab',
  steps: 'Этапы занятий',
  consultation: 'Форма консультации',
}

export const buttonAction = defineType({
  name: 'buttonAction',
  title: 'Действие кнопки',
  type: 'object',
  fields: [
    defineField({
      name: 'actionType',
      title: 'Что должна делать кнопка?',
      description: 'Выберите готовое действие. Адреса Telegram берутся из общего раздела «Социальные сети и Telegram».',
      type: 'string',
      options: {
        layout: 'radio',
        list: Object.entries(actionLabels).map(([value, title]) => ({title, value})),
      },
      validation: (Rule) => Rule.required().error('Выберите действие кнопки.'),
    }),
    defineField({
      name: 'section',
      title: 'К какому разделу сайта перейти?',
      description: 'Выберите раздел из списка — вводить служебный адрес вручную не нужно.',
      type: 'string',
      options: {
        list: Object.entries(sectionLabels).map(([value, title]) => ({title, value})),
      },
      hidden: ({parent}) => parent?.actionType !== 'section',
      validation: (Rule) => Rule.custom((value, context) => (
        context.parent?.actionType !== 'section' || value
          ? true
          : 'Выберите раздел сайта.'
      )),
    }),
    defineField({
      name: 'externalUrl',
      title: 'Полная ссылка',
      description: 'Например: https://example.ru/page. Опасные и неполные адреса сайт не примет.',
      type: 'string',
      hidden: ({parent}) => parent?.actionType !== 'external',
      validation: (Rule) => Rule.custom((value, context) => {
        if (context.parent?.actionType !== 'external') return true
        return validateSafePublicUrl(value)
      }),
    }),
  ],
  preview: {
    select: {actionType: 'actionType', section: 'section', externalUrl: 'externalUrl'},
    prepare: ({actionType, section, externalUrl}) => ({
      title: actionLabels[actionType] || 'Действие не выбрано',
      subtitle: actionType === 'section'
        ? sectionLabels[section] || 'Раздел не выбран'
        : actionType === 'external'
          ? externalUrl || 'Ссылка не указана'
          : undefined,
    }),
  },
})
