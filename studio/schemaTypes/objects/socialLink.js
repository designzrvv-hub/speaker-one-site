export const socialLink = {
  name: 'socialLink',
  title: 'Социальная ссылка',
  type: 'object',
  fields: [
    {
      name: 'network',
      title: 'Площадка',
      description: 'Выберите канал, к которому относится ссылка.',
      type: 'string',
      options: {
        list: [
          {title: 'Telegram', value: 'telegram'},
          {title: 'ВКонтакте', value: 'vkontakte'},
          {title: 'YouTube', value: 'youtube'},
          {title: 'Дзен', value: 'dzen'},
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'label',
      title: 'Подпись ссылки',
      description: 'Название, которое увидит пользователь.',
      type: 'string',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите понятную подпись ссылки.'),
        Rule.max(40).warning('Подпись длиннее 40 символов может плохо выглядеть в меню или подвале.'),
      ],
    },
    {
      name: 'url',
      title: 'Ссылка',
      description: 'Полный рабочий адрес, начинающийся с https://.',
      type: 'url',
      validation: (Rule) =>
        Rule.required()
          .uri({scheme: ['https'], allowRelative: false})
          .error('Укажите полный рабочий HTTPS-адрес социальной сети.'),
    },
    {
      name: 'isVisible',
      title: 'Показывать ссылку',
      description: 'Отключите, если ссылка ещё не готова к публикации.',
      type: 'boolean',
      initialValue: true,
    },
  ],
  preview: {
    select: {title: 'label', subtitle: 'url'},
  },
}
