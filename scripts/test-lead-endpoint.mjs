const endpoint = String(process.env.LEAD_TEST_ENDPOINT || '').trim();
const secret = String(process.env.LEAD_WEBHOOK_SECRET || '').trim();

if (!endpoint || !secret) {
  console.error('Для теста задайте LEAD_TEST_ENDPOINT и LEAD_WEBHOOK_SECRET только в локальном/server окружении.');
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Lead-Webhook-Secret': secret},
  body: JSON.stringify({test: true}),
});
const payload = await response.json().catch(() => null);
if (!response.ok || payload?.ok !== true) {
  console.error(`Тест не подтверждён endpoint: HTTP ${response.status}.`);
  process.exit(1);
}
console.log('Endpoint и Telegram подтвердили безопасную тестовую отправку.');
