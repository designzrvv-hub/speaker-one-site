import {defineField, defineType} from 'sanity'
import {editorialNoticeField} from '../editorialNotice.jsx'

const linkField = (name, title, description) => defineField({
  name,
  title,
  description,
  type: 'publicLink',
})

export const linksSettings = defineType({
  name: 'linksSettings',
  title: 'Социальные сети и Telegram',
  type: 'document',
  description: 'Единое место для публичных ссылок. Секретные ключи и Bot Token здесь хранить нельзя.',
  groups: [
    {name: 'telegram', title: 'Telegram', default: true},
    {name: 'social', title: 'Другие площадки'},
    {name: 'portfolio', title: 'Портфолио'},
  ],
  fields: [
    editorialNoticeField,
    defineField({
      ...linkField('primaryTelegram', 'Основной Telegram', 'Ссылка для прямого общения.'),
      group: 'telegram',
    }),
    defineField({
      ...linkField('telegramBot', 'Telegram-бот', 'Ссылка на уже созданного бота, например https://t.me/speaker_one_bot. Bot Token сюда вставлять нельзя.'),
      group: 'telegram',
    }),
    defineField({
      ...linkField('telegramChannel', 'Telegram-канал', 'Ссылка на канал, на который должен перейти пользователь.'),
      group: 'telegram',
    }),
    defineField({...linkField('vkontakte', 'ВКонтакте', 'Полная ссылка на публичную страницу или профиль.'), group: 'social'}),
    defineField({...linkField('youtube', 'YouTube', 'Полная ссылка на канал.'), group: 'social'}),
    defineField({...linkField('dzen', 'Дзен', 'Полная ссылка на канал в Дзене.'), group: 'social'}),
    defineField({...linkField('rutube', 'Rutube', 'Заполните, только если площадка используется.'), group: 'social'}),
    defineField({...linkField('instagram', 'Instagram', 'Заполните, только если площадка используется и ссылка доступна аудитории.'), group: 'social'}),
    defineField({...linkField('whatsapp', 'WhatsApp', 'Заполните, только если этот канал связи используется публично.'), group: 'social'}),
    defineField({...linkField('portfolio', 'Портфолио', 'Ссылка на актуальное портфолио.'), group: 'portfolio'}),
  ],
  preview: {
    select: {bot: 'telegramBot.url'},
    prepare: ({bot}) => ({
      title: 'Социальные сети и Telegram',
      subtitle: bot ? 'Telegram-бот указан' : 'Telegram-бот не указан',
    }),
  },
})
