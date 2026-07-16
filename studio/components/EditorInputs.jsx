import React from 'react'

const hintStyle = {fontSize: 12, lineHeight: 1.45, marginTop: 7, opacity: 0.72}

function CharacterCountInput({recommendedMax, ...props}) {
  const length = typeof props.value === 'string' ? [...props.value].length : 0
  const exceeded = length > recommendedMax
  return (
    <div>
      {props.renderDefault(props)}
      <div style={{...hintStyle, color: exceeded ? '#d94b4b' : 'inherit'}}>
        Сейчас: {length} {length === 1 ? 'символ' : 'символов'}. Рекомендуется до {recommendedMax}.
      </div>
    </div>
  )
}

export function SeoTitleInput(props) {
  return <CharacterCountInput {...props} recommendedMax={65} />
}

export function SeoDescriptionInput(props) {
  return <CharacterCountInput {...props} recommendedMax={165} />
}

export function PublicUrlInput(props) {
  const value = typeof props.value === 'string' ? props.value.trim() : ''
  let safeUrl = ''
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'https:') safeUrl = parsed.toString()
  } catch {
    safeUrl = ''
  }

  return (
    <div>
      {props.renderDefault(props)}
      {safeUrl ? (
        <a href={safeUrl} target="_blank" rel="noreferrer" style={{...hintStyle, display: 'inline-block'}}>
          Открыть и проверить ссылку ↗
        </a>
      ) : (
        <div style={hintStyle}>После ввода полного HTTPS-адреса здесь появится ссылка для проверки.</div>
      )}
    </div>
  )
}
