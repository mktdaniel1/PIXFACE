// src/orquestrador.js
// Cérebro do loop (variante Slack). Chame aoReceberMensagem() do seu webhook 2chat,
// com o remetente já normalizado (você resolve isso no Pulso via extrairRemetente).
//
// Fluxo: identifica cliente → Claude extrai o valor → se confiança alta, enfileira
// a geração (resultado vai pro Slack); se ambíguo, escala pra CS no Slack.

import { extrairAporte } from './extrair.js';
import { enfileirar } from './fila.js';
import { clientePorRemetente } from './clientes.js';
import { escalarParaCs } from './cs-alerta.js';
import { grossUp } from './imposto.js';

const CONFIANCA_MIN = 0.6;

export async function aoReceberMensagem({ remetente, texto }) {
  const conta = await clientePorRemetente(remetente);
  if (!conta) return; // remetente não mapeado → ignora

  const { ehAporte, valor, confianca } = await extrairAporte(texto);
  if (!ehAporte || !valor) return; // não é aporte → segue o fluxo normal do Pulso

  if (confianca < CONFIANCA_MIN) {
    return escalarParaCs({ remetente, conta, texto, motivo: 'valor ambíguo — confirmar manualmente' });
  }

  // grossUp embute o imposto pra sobrar o líquido p/ mídia. Troque por `valor` se cobra o bruto.
  enfileirar({ remetente, conta, valorBruto: grossUp(valor) });
}
