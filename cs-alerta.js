// src/cs-alerta.js — escala erros/ambiguidades pra CS no Slack (mesmo webhook do sucesso).
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export async function escalarParaCs(info) {
  console.warn('[CS escalação]', JSON.stringify(info));
  if (!SLACK_WEBHOOK) return;

  const conta = info?.conta?.nome ?? info?.conta ?? '-';
  const valor = info?.valorBruto ? `R$ ${Number(info.valorBruto).toFixed(2)}` : '-';
  const detalhe = info?.erro ?? info?.motivo ?? 'sem detalhe';

  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `⚠️ Aporte precisa de atenção da CS — ${conta}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '⚠️ Aporte precisa de atenção' } },
          { type: 'section', fields: [
            { type: 'mrkdwn', text: `*Conta:*\n${conta}` },
            { type: 'mrkdwn', text: `*Cliente (WhatsApp):*\n${info?.remetente ?? '-'}` },
            { type: 'mrkdwn', text: `*Valor:*\n${valor}` },
          ]},
          { type: 'section', text: { type: 'mrkdwn', text: `*Motivo:*\n\`\`\`${detalhe}\`\`\`` } },
        ],
      }),
    });
  } catch (e) {
    console.error('falha ao escalar pro Slack', e);
  }
}
