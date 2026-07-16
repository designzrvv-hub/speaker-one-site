export const navigationItem = {
  name: 'navigationItem',
  title: 'Пункт навигации',
  type: 'object',
  fields: [
    {
      name: 'label',
      title: 'Название пункта меню',
      description: 'Короткое название, которое пользователь видит в верхнем меню.',
      type: 'string',
      validation: (Rule) => [
        Rule.required().min(2).error('Укажите название пункта меню.'),
        Rule.max(30).warning('Название длиннее 30 символов может не поместиться в навигации.'),
      ],
    },
    {
      name: 'href',
      title: 'Прежний адрес пункта',
      type: 'string',
      hidden: true,
      readOnly: true,
    },
    {
      name: 'destination',
      title: 'Куда должен вести этот пункт?',
      description: 'Выберите раздел сайта или безопасную внешнюю ссылку.',
      type: 'buttonAction',
      validation: (Rule) => Rule.required().error('Выберите, куда ведёт пункт меню.'),
    },
    {
      name: 'order',
      title: 'Порядок отображения',
      description: 'Меньшее число показывает пункт раньше. Порядок секций сайта при этом не меняется.',
      type: 'number',
      initialValue: 100,
      validation: (Rule) =>
        Rule.required()
          .integer()
          .min(0)
          .max(1000)
          .error('Укажите целое число от 0 до 1000.'),
    },
    {
      name: 'isVisible',
      title: 'Показывать этот пункт на сайте',
      description: 'Скрывает только ссылку в меню, но не сам раздел сайта.',
      type: 'boolean',
      initialValue: true,
    },
  ],
  preview: {
    select: {title: 'label', actionType: 'destination.actionType', section: 'destination.section'},
    prepare: ({title, actionType, section}) => ({
      title: title || 'Пункт меню',
      subtitle: actionType === 'section' ? `Раздел: ${section || 'не выбран'}` : 'Настроенное действие',
    }),
  },
}
