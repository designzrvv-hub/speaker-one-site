import {defineField, defineType} from 'sanity'
import {PublicUrlInput} from '../../components/EditorInputs.jsx'

const PLACEHOLDER_PATTERN = /your_|example\.(?:com|org|net)|speaker-one\.example/i

export const publicLink = defineType({
  name: 'publicLink',
  title: 'Публичная ссылка',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Полная ссылка',
      description: 'Ссылка должна начинаться с https://. После сохранения откройте её и проверьте.',
      type: 'url',
      components: {input: PublicUrlInput},
      validation: (Rule) => [
        Rule.custom((value, context) => {
          if (!value && context.parent?.isVisible === true) return 'Укажите ссылку или отключите её показ на сайте.'
          if (!value) return true

          try {
            const parsed = new URL(value)
            return parsed.protocol === 'https:' ? true : 'Ссылка должна начинаться с https://.'
          } catch {
            return 'Укажите полный HTTPS-адрес.'
          }
        }),
        Rule.custom((value) => !value || !PLACEHOLDER_PATTERN.test(value)
          ? true
          : 'Это временная ссылка. Замените её перед публикацией.').warning(),
      ],
    }),
    defineField({
      name: 'isVisible',
      title: 'Показывать эту ссылку на сайте',
      description: 'Отключите, пока ссылка не готова или остаётся временной.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {url: 'url', isVisible: 'isVisible'},
    prepare: ({url, isVisible}) => ({
      title: url || 'Ссылка не заполнена',
      subtitle: PLACEHOLDER_PATTERN.test(url || '')
        ? 'Требуется заменить перед публикацией'
        : isVisible === false ? 'Скрыта на сайте' : 'Показывается на сайте',
    }),
  },
})
