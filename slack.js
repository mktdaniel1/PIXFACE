// src/slack.js — entrega o resultado num canal do Slack (Incoming Webhook).
// Webhook é o caminho mais simples: só um POST. Se quiser botões (ex.: "Enviado"),
// troque por bot token + chat.postMessage depois.

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export async function postarNoSlack({ conta, adAccountId, valorBruto, copiaECola, remetente }) {
  const payload = {
    text: `Pix gerado para ${conta}: R$ ${valorBruto.toFixed(2)}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `💸 Pix gerado — ${conta}` } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Conta:*\n${conta}` },
          { type: 'mrkdwn', text: `*ID:*\n${adAccountId}` },
          { type: 'mrkdwn', text: `*Valor:*\nR$ ${valorBruto.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Cliente (WhatsApp):*\n${remetente ?? '-'}` },
        ],
      },
      { type: 'section', text: { type: 'mrkdwn', text: `*Copia e cola:*\n\`\`\`${copiaECola}\`\`\`` } },
    ],
  };

  const res = await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Slack recusou: ${res.status}`);
}
