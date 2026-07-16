import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'

const isPolicyUrl = (value) => {
  if (!value) return 'Укажите ссылку на политику конфиденциальности.'
  if (value.startsWith('/')) return true

  try {
    return new URL(value).protocol === 'https:'
      ? true
      : 'Внешняя ссылка должна начинаться с https://.'
  } catch {
    return 'Укажите внутренний путь или полный HTTPS-адрес.'
  }
}

export const legal = defineType({
  name: 'legal',
  title: 'Юридические данные',
  type: 'document',
  description: 'Реальные реквизиты владельца сайта и ссылка на политику. Доступ к этому разделу должен быть только у Admin.',
  initialValue: {
    entityType: 'individualEntrepreneur',
  },
  fields: [
    editorialNoticeField,
    defineField({
      name: 'entityType',
      title: 'Форма деятельности',
      description: 'На текущем сайте используется индивидуальный предприниматель.',
      type: 'string',
      readOnly: true,
      options: {list: [{title: 'Индивидуальный предприниматель', value: 'individualEntrepreneur'}]},
      validation: (Rule) => Rule.required().error('Выберите форму деятельности.'),
    }),
    defineField({
      name: 'ownerFullName',
      title: 'Имя ИП или название организации',
      description: 'Укажите данные точно как в официальных документах, без сокращений и украшений.',
      type: 'string',
      validation: (Rule) => [
        Rule.required().min(5).error('Укажите имя ИП или официальное название организации.'),
        Rule.max(150).warning('Проверьте слишком длинное наименование перед публикацией.'),
      ],
    }),
    defineField({
      name: 'inn',
      title: 'ИНН',
      description: 'Для индивидуального предпринимателя — ровно 12 цифр без пробелов.',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .regex(/^\d{12}$/, {name: '12 цифр'})
          .error('ИНН индивидуального предпринимателя должен содержать ровно 12 цифр.'),
    }),
    defineField({
      name: 'ogrnip',
      title: 'ОГРНИП',
      description: 'Ровно 15 цифр без пробелов.',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .regex(/^\d{15}$/, {name: '15 цифр'})
          .error('ОГРНИП должен содержать ровно 15 цифр.'),
    }),
    defineField({
      name: 'privacyPolicyUrl',
      title: 'Ссылка на Политику конфиденциальности',
      description: 'Внутренний путь, например /privacy-policy.html, или полный HTTPS-адрес.',
      type: 'string',
      validation: (Rule) => Rule.required().custom(isPolicyUrl),
    }),
    defineField({
      name: 'consentPrefix',
      title: 'Текст согласия перед ссылкой',
      description: 'Текст рядом с обязательным чекбоксом формы до названия Политики.',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'consentLinkLabel',
      title: 'Название ссылки на Политику',
      description: 'Обычно: «Политикой конфиденциальности».',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'consentSuffix',
      title: 'Текст после ссылки',
      description: 'Обычно используется точка.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publicOfferUrl',
      title: 'Ссылка на публичную оферту',
      description: 'Необязательно. Заполняйте только если оферта реально используется и опубликована.',
      type: 'string',
      validation: (Rule) => Rule.custom((value) => !value || isPolicyUrl(value)),
    }),
  ],
  preview: {
    select: {subtitle: 'ownerFullName'},
    prepare: ({subtitle}) => ({title: 'Юридическая информация', subtitle}),
  },
})
