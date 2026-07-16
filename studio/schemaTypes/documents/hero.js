import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'
import {validateReferencedMediaAlt} from '../validation.js'

export const hero = defineType({
  name: 'hero',
  title: 'Первый экран',
  type: 'document',
  description: 'Главный текст, кнопка и карточка эксперта на первом экране сайта.',
  initialValue: {
    primaryCtaAction: 'scrollToForm',
  },
  groups: [
    {name: 'content', title: 'Тексты', default: true},
    {name: 'button', title: 'Кнопка'},
    {name: 'media', title: 'Фотография'},
    {name: 'expert', title: 'Подпись эксперта'},
  ],
  fields: [
    editorialNoticeField,
    defineField({
      name: 'eyebrow',
      title: 'Верхняя короткая подпись',
      description: 'Небольшой текст над главным заголовком.',
      type: 'string',
      group: 'content',
      validation: (Rule) => [
        Rule.required().error('Укажите верхнюю подпись первого экрана.'),
        Rule.max(100).warning('Подпись длиннее 100 символов может занимать слишком много места.'),
      ],
    }),
    defineField({
      name: 'titleMain',
      title: 'Основной заголовок',
      description: 'Главная фраза первого экрана. После изменения проверьте переносы на телефоне.',
      type: 'string',
      group: 'content',
      validation: (Rule) => [
        Rule.required().min(10).error('Укажите основную часть заголовка минимум из 10 символов.'),
        Rule.max(90).warning('Заголовок длиннее 90 символов нужно проверить на мобильном экране.'),
      ],
    }),
    defineField({
      name: 'titleAccent',
      title: 'Дополнительная выделенная часть заголовка',
      description: 'Продолжение главного заголовка, которое показано золотым курсивом.',
      type: 'string',
      group: 'content',
      validation: (Rule) => [
        Rule.required().min(10).error('Укажите акцентную часть заголовка.'),
        Rule.max(100).warning('Длинная акцентная часть может нарушить переносы заголовка.'),
      ],
    }),
    defineField({
      name: 'subtitle',
      title: 'Короткая фраза под заголовком',
      description: 'Одна ясная мысль между заголовком и основным описанием.',
      type: 'text',
      rows: 2,
      group: 'content',
      validation: (Rule) => [
        Rule.required().min(20).error('Укажите смысловой подзаголовок.'),
        Rule.max(180).warning('Подзаголовок длиннее 180 символов стоит сократить.'),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Основное описание',
      description: 'Коротко объясняет пользу и формат работы. Не добавляйте HTML.',
      type: 'text',
      rows: 4,
      group: 'content',
      validation: (Rule) => [
        Rule.required().min(40).error('Укажите основное описание минимум из 40 символов.'),
        Rule.max(500).warning('Описание длиннее 500 символов перегружает первый экран.'),
      ],
    }),
    defineField({
      name: 'primaryCtaLabel',
      title: 'Текст на главной кнопке',
      description: 'Коротко назовите действие, например «Записаться на консультацию».',
      type: 'string',
      group: 'button',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите текст главной кнопки.'),
        Rule.max(60).warning('Длинный текст кнопки нужно проверить на экране 320 px.'),
      ],
    }),
    defineField({
      name: 'primaryCtaAction',
      title: 'Прежнее действие кнопки',
      type: 'string',
      group: 'button',
      initialValue: 'scrollToForm',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'primaryButtonAction',
      title: 'Что должна делать главная кнопка?',
      description: 'Выберите готовое действие. Для формы или Telegram вводить служебный адрес не нужно.',
      type: 'buttonAction',
      group: 'button',
      validation: (Rule) => Rule.required().error('Выберите действие главной кнопки.'),
    }),
    defineField({
      name: 'ctaNote',
      title: 'Подпись под кнопкой',
      description: 'Спокойно объясняет, что произойдёт после нажатия.',
      type: 'text',
      rows: 2,
      group: 'button',
      validation: (Rule) => [
        Rule.required().min(20).error('Укажите подпись под кнопкой.'),
        Rule.max(220).warning('Подпись длиннее 220 символов может перегрузить первый экран.'),
      ],
    }),
    defineField({
      name: 'image',
      title: 'Главная фотография первого экрана',
      description: 'Выберите фотографию из раздела «Изображения» и проверьте, что лицо остаётся в кадре.',
      type: 'reference',
      to: [{type: 'media'}],
      group: 'media',
      options: {filter: 'usage in ["hero", "portrait"]'},
      validation: (Rule) => [
        Rule.required().error('Выберите фотографию для первого экрана.'),
        Rule.custom(validateReferencedMediaAlt),
      ],
    }),
    defineField({
      name: 'founderLabel',
      title: 'Подпись основателя',
      description: 'Небольшая строка над именем на карточке фотографии.',
      type: 'string',
      group: 'expert',
      validation: (Rule) => [
        Rule.required().error('Укажите подпись основателя.'),
        Rule.max(80).warning('Подпись длиннее 80 символов может увеличить плашку на фотографии.'),
      ],
    }),
    defineField({
      name: 'expertName',
      title: 'Имя эксперта',
      description: 'Главный визуальный акцент в нижней плашке фотографии.',
      type: 'string',
      group: 'expert',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите имя эксперта.'),
        Rule.max(80).warning('Проверьте длинное имя на мобильном экране.'),
      ],
    }),
    defineField({
      name: 'expertRole',
      title: 'Роль эксперта',
      description: 'Короткое профессиональное описание без неподтверждённых заявлений.',
      type: 'text',
      rows: 2,
      group: 'expert',
      validation: (Rule) => [
        Rule.required().min(10).error('Укажите роль эксперта.'),
        Rule.max(180).warning('Роль длиннее 180 символов может сделать плашку слишком высокой.'),
      ],
    }),
  ],
  preview: {
    select: {subtitle: 'titleMain'},
    prepare: ({subtitle}) => ({
      title: `Первый экран — ${subtitle || 'заголовок не заполнен'}`,
      subtitle: 'Главный экран сайта',
    }),
  },
})
