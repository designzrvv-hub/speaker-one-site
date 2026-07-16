import {defineField} from 'sanity'

const noticeStyle = {
  background:
    'linear-gradient(135deg, color-mix(in srgb, #d9b978 13%, transparent), color-mix(in srgb, #1c2738 85%, transparent))',
  border: '1px solid color-mix(in srgb, #d9b978 44%, transparent)',
  borderRadius: '10px',
  color: '#f6f0e5',
  lineHeight: 1.55,
  padding: '14px 16px',
}

const headingStyle = {
  display: 'block',
  fontSize: '14px',
  marginBottom: '5px',
}

const textStyle = {
  fontSize: '13px',
  margin: 0,
  opacity: 0.84,
}

export function EditorialNoticeInput() {
  return (
    <aside style={noticeStyle} aria-label="Важное сообщение о публикации">
      <strong style={headingStyle}>Публикация в Sanity пока не обновляет сайт</strong>
      <p style={textStyle}>
        Сначала проверьте поля и предупреждения. После публикации документа публичный сайт
        изменится только после отдельной пересборки, которая будет подключена на следующих
        этапах.
      </p>
    </aside>
  )
}

export const editorialNoticeField = defineField({
  name: 'editorialWorkflowNotice',
  title: 'Редакционный процесс',
  type: 'string',
  readOnly: true,
  components: {
    input: EditorialNoticeInput,
  },
})
