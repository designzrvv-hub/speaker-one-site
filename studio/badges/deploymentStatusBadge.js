export function deploymentStatusBadge() {
  return {
    label: 'Без автопубликации',
    title:
      'Публикация документа в Sanity пока не обновляет публичный сайт. Для обновления потребуется отдельная пересборка.',
    color: 'warning',
  }
}
