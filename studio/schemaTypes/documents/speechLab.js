import {defineArrayMember, defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {rejectHtml, validateReferencedMediaAlt, validateStableKey} from '../validation.js'

const requiredText = (Rule) => Rule.required().custom(rejectHtml)

const rangesDoNotOverlap = (results = []) => {
  const ranges = results
    .filter((item) => Number.isFinite(item?.minScore) && Number.isFinite(item?.maxScore))
    .map((item) => ({min: item.minScore, max: item.maxScore}))
    .sort((left, right) => left.min - right.min)

  for (let index = 0; index < ranges.length; index += 1) {
    if (ranges[index].min > ranges[index].max) return 'Минимальная граница не может быть больше максимальной.'
    if (index > 0 && ranges[index].min <= ranges[index - 1].max) {
      return 'Диапазоны результатов пересекаются. Исправьте минимальные и максимальные границы.'
    }
  }
  return true
}

export const speechLab = defineType({
  name: 'speechLab',
  title: 'Speech Lab',
  type: 'document',
  description: 'Вопросы, ответы, результаты и финальная кнопка короткой речевой диагностики.',
  groups: [
    {name: 'intro', title: 'Описание диагностики', default: true},
    {name: 'questions', title: 'Вопросы'},
    {name: 'results', title: 'Результаты'},
    {name: 'interface', title: 'Подписи кнопок и прогресса'},
    {name: 'cta', title: 'Финальный призыв'},
  ],
  fields: [
    editorialNoticeField,
    defineField({name: 'image', title: 'Фотография Speech Lab', type: 'reference', to: [{type: 'media'}], group: 'intro', options: {filter: 'usage in ["section", "portrait"]'}, validation: (Rule) => Rule.custom(validateReferencedMediaAlt)}),
    defineField({name: 'eyebrow', title: 'Верхняя подпись', type: 'string', group: 'intro', validation: requiredText}),
    defineField({name: 'title', title: 'Заголовок диагностики', type: 'string', group: 'intro', validation: requiredText}),
    defineField({name: 'description', title: 'Вступительное описание', type: 'text', rows: 4, group: 'intro', validation: requiredText}),
    defineField({
      name: 'questions',
      title: 'Вопросы',
      description: 'Рекомендуется четыре вопроса и три естественных варианта ответа для каждого.',
      type: 'array',
      group: 'questions',
      of: [defineArrayMember({
        name: 'speechQuestion',
        title: 'Вопрос',
        type: 'object',
        groups: [
          {name: 'content', title: 'Текст вопроса', default: true},
          {name: 'service', title: 'Служебные настройки результата'},
        ],
        fields: [
          defineField({name: 'internalKey', title: 'Служебный ключ', type: 'string', group: 'service', hidden: true, readOnly: true, validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'shortTitle', title: 'Короткое название ситуации', type: 'string', group: 'content', validation: requiredText}),
          defineField({name: 'prompt', title: 'Текст вопроса', type: 'text', rows: 3, group: 'content', validation: requiredText}),
          defineField({name: 'order', title: 'Порядок отображения', type: 'number', group: 'service', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
          defineField({
            name: 'options',
            title: 'Варианты ответа',
            type: 'array',
            group: 'content',
            of: [defineArrayMember({
              name: 'speechOption',
              title: 'Вариант ответа',
              type: 'object',
              groups: [
                {name: 'content', title: 'Текст ответа', default: true},
                {name: 'service', title: 'Служебная настройка результата'},
              ],
              fields: [
                defineField({name: 'text', title: 'Текст варианта', type: 'text', rows: 3, group: 'content', validation: requiredText}),
                defineField({name: 'weight', title: 'Служебное значение результата', description: 'Техническое число помогает выбрать итог. Не изменяйте без необходимости.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer().min(-20).max(20)}),
              ],
              preview: {select: {title: 'text'}, prepare: ({title}) => ({title: title || 'Вариант ответа', subtitle: 'Ответ пользователя'})},
            })],
            validation: (Rule) => [
              Rule.required().min(2).error('Добавьте минимум два варианта ответа.'),
              Rule.custom((items = []) => items.length === 3 || 'Рекомендуется использовать три варианта ответа.').warning(),
            ],
          }),
        ],
        preview: {
          select: {title: 'shortTitle', prompt: 'prompt', order: 'order'},
          prepare: ({title, prompt, order}) => ({
            title: `Вопрос ${Math.max(1, Math.round((order || 10) / 10))} — ${title || 'название не заполнено'}`,
            subtitle: prompt,
          }),
        },
      })],
      validation: (Rule) => [
        Rule.required().min(1).error('Добавьте хотя бы один вопрос.'),
        Rule.custom((items = []) => {
          const keys = items.map((item) => item?.internalKey).filter(Boolean)
          return new Set(keys).size === keys.length ? true : 'Стабильные ключи вопросов не должны повторяться.'
        }),
      ],
    }),
    defineField({
      name: 'results',
      title: 'Результаты диагностики',
      type: 'array',
      group: 'results',
      of: [defineArrayMember({
        name: 'speechResult',
        title: 'Результат',
        type: 'object',
        groups: [
          {name: 'content', title: 'Текст результата', default: true},
          {name: 'service', title: 'Служебные настройки результата'},
        ],
        fields: [
          defineField({name: 'internalKey', title: 'Служебный ключ', type: 'string', group: 'service', hidden: true, readOnly: true, validation: (Rule) => Rule.required().custom(validateStableKey)}),
          defineField({name: 'title', title: 'Название результата', type: 'string', group: 'content', validation: requiredText}),
          defineField({name: 'description', title: 'Описание результата', type: 'text', rows: 4, group: 'content', validation: requiredText}),
          defineField({name: 'recommendation', title: 'Практическая рекомендация', type: 'text', rows: 4, group: 'content', validation: requiredText}),
          defineField({name: 'minScore', title: 'Нижняя граница результата', description: 'Служебное значение. Не изменяйте без проверки всей диагностики.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer()}),
          defineField({name: 'maxScore', title: 'Верхняя граница результата', description: 'Служебное значение. Не изменяйте без проверки всей диагностики.', type: 'number', group: 'service', validation: (Rule) => Rule.required().integer()}),
          defineField({name: 'order', title: 'Порядок отображения', type: 'number', group: 'service', initialValue: 100, validation: (Rule) => Rule.required().integer().min(0).max(1000)}),
        ],
        preview: {select: {title: 'title'}, prepare: ({title}) => ({title: title || 'Результат диагностики', subtitle: 'Итог и рекомендация'})},
      })],
      validation: (Rule) => [
        Rule.required().min(1).error('Добавьте хотя бы один результат.'),
        Rule.custom(rangesDoNotOverlap),
        Rule.custom((items = []) => {
          const keys = items.map((item) => item?.internalKey).filter(Boolean)
          return new Set(keys).size === keys.length ? true : 'Стабильные ключи результатов не должны повторяться.'
        }),
      ],
    }),
    defineField({name: 'situationLabel', title: 'Подпись текущей ситуации', type: 'string', group: 'interface', validation: requiredText}),
    defineField({name: 'completedLabel', title: 'Подпись завершения', type: 'string', group: 'interface', validation: requiredText}),
    defineField({name: 'progressAriaLabel', title: 'Описание прогресса для скринридера', type: 'string', group: 'interface', validation: requiredText}),
    defineField({name: 'backLabel', title: 'Текст кнопки «Назад»', type: 'string', group: 'interface', validation: requiredText}),
    defineField({name: 'resultEyebrow', title: 'Верхняя подпись результата', type: 'string', group: 'interface', validation: requiredText}),
    defineField({name: 'recommendationLabel', title: 'Подпись рекомендации', type: 'string', group: 'interface', validation: requiredText}),
    defineField({name: 'ctaTitle', title: 'Заголовок финального призыва', type: 'string', group: 'cta', validation: requiredText}),
    defineField({name: 'ctaDescription', title: 'Описание финального шага', type: 'text', rows: 3, group: 'cta', validation: requiredText}),
    defineField({name: 'ctaLabel', title: 'Текст кнопки консультации', type: 'string', group: 'cta', validation: requiredText}),
    defineField({name: 'buttonAction', title: 'Что должна делать кнопка?', type: 'buttonAction', group: 'cta', validation: (Rule) => Rule.required()}),
    defineField({name: 'resetLabel', title: 'Текст кнопки повторного прохождения', type: 'string', group: 'cta', validation: requiredText}),
  ],
  preview: {prepare: () => ({title: 'Speech Lab', subtitle: 'Вопросы, результаты и финальный призыв'})},
})
