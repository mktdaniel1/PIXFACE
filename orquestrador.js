// src/orquestrador.js
// Cérebro do loop (variante Slack). Agora com LOG em cada passo e escalação no Slack
// em qualquer beco sem saída — nada mais sai calado.

import { extrairAporte } from './extrair.js';
import { enfileirar } from './fila.js';
import { clientePorRemetente } from './clientes.js';
import { escalarParaCs } from './cs-alerta.js';
import { grossUp } from './imposto.js';

const CONFIANCA_MIN = 0.6;

export async function aoReceberMensagem({ remetente, texto }) {
  console.log('[orq] recebido:', { remetente, texto });

  const conta = await clientePorRemetente(remetente);
  if (!conta) {
    console.warn('[orq] conta não encontrada para', remetente);
    return escalarParaCs({ remetente, motivo: `Remetente ${remetente} não está no clientes.js` });
  }
  console.log('[orq] conta:', conta.nome, conta.adAccountId);

  const r = await extrairAporte(texto);
  console.log('[orq] extração:', r);

  if (!r.ehAporte || !r.valor) {
    return escalarParaCs({ remetente, conta, motivo: `Não identifiquei um valor em: "${texto}"` });
  }
  if (r.confianca < CONFIANCA_MIN) {
    return escalarParaCs({ remetente, conta, motivo: `Valor ambíguo: ${r.valor} (confiança ${r.confianca})` });
  }

  const valorBruto = grossUp(r.valor); // troque por r.valor se a planilha já traz o bruto
  console.log('[orq] enfileirando geração:', conta.adAccountId, valorBruto);
  enfileirar({ remetente, conta, valorBruto });
}
