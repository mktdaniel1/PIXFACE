// src/fila.js
// Fila SERIALIZADA: gera os Pix na Meta um de cada vez (sessões paralelas no mesmo
// login = checkpoint). Resultado vai pro Slack. Em produção: troque o array por Postgres.

import { gerarPixMeta } from './metaPix.js';
import { postarNoSlack } from './slack.js';
import { escalarParaCs } from './cs-alerta.js';

const fila = [];
const recentes = new Map(); // dedup
let rodando = false;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

export function enfileirar(job) {
  const chave = `${job.remetente}:${job.valorBruto}`;
  const ultimo = recentes.get(chave);
  if (ultimo && Date.now() - ultimo < 5 * 60_000) return; // ignora repetição em 5min
  recentes.set(chave, Date.now());
  fila.push(job);
  processar();
}

async function processar() {
  if (rodando) return;
  rodando = true;
  while (fila.length) {
    const { remetente, conta, valorBruto } = fila.shift();
    try {
      const { copiaECola } = await gerarPixMeta({ ...conta, valorBruto });
      await postarNoSlack({
        conta: conta.nome,
        adAccountId: conta.adAccountId,
        valorBruto,
        copiaECola,
        remetente,
      });
    } catch (e) {
      await escalarParaCs({ remetente, conta, valorBruto, erro: String(e?.message ?? e) });
    }
    await pausa(4000 + Math.random() * 4000); // ritmo humano entre contas
  }
  rodando = false;
}
