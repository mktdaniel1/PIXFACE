import './bootstrapSessao.js';
// src/server.js
// Entrada: webhook do 2chat (mensagens recebidas) → orquestrador → Slack.

import express from 'express';
import { aoReceberMensagem } from './orquestrador.js';
import { enfileirar } from './fila.js';

const app = express();
app.use(express.json());

// Geração DIRETA: a CS manda conta + valor. Sem telefone, sem clientes.js.
// O resultado (Pix ou erro) cai no Slack. Use o valor que vai entrar na Meta (bruto).
app.post('/gerar', (req, res) => {
  const { adAccountId, businessId, nome = 'Conta', valor } = req.body ?? {};
  if (!adAccountId || !businessId) {
    return res.status(400).json({ ok: false, erro: 'Informe adAccountId e businessId.' });
  }
  if (!(valor > 0)) {
    return res.status(400).json({ ok: false, erro: 'Valor inválido.' });
  }
  // remetente único por chamada → evita o dedup bloquear testes repetidos.
  enfileirar({
    remetente: `CS-${Date.now()}`,
    conta: { nome, businessId, adAccountId },
    valorBruto: Number(valor),
  });
  res.json({ ok: true, mensagem: `Gerando Pix de R$ ${Number(valor).toFixed(2)} para ${nome}. O resultado vai pro Slack.` });
});

// Webhook do 2chat. Ajuste a extração ao payload real (você já faz no Pulso).
app.post('/webhook/2chat', (req, res) => {
  res.sendStatus(200); // responde rápido; processa async pra não segurar o webhook
  (async () => {
    try {
      const ev = req.body ?? {};
      const remetente = ev?.message?.from_number ?? ev?.participant?.phone_number;
      const texto = ev?.message?.text ?? '';
      if (remetente && texto) await aoReceberMensagem({ remetente, texto });
    } catch (e) {
      console.error('webhook erro', e);
    }
  })();
});

// Teste manual: simula um cliente, pra validar Meta+Slack antes de plugar o 2chat.
app.post('/test', async (req, res) => {
  const { remetente = '5511999990000', texto = 'quero investir 500' } = req.body ?? {};
  try {
    await aoReceberMensagem({ remetente, texto });
    res.json({ ok: true });
  } catch (e) {
    console.error('test erro', e);
    res.status(200).json({ ok: false, erro: String(e?.message ?? e) });
  }
});

// Evita que qualquer erro não tratado derrube o container.
process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3000, () => console.log('Agent de aporte no ar.'));
