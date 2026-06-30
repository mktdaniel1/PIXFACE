// src/extrair.js
// Extrai a intenção de aporte de uma mensagem livre do cliente no WhatsApp.
// Robusto a "mil", "1k", "R$ 1.500,00", "quero colocar uns 800", etc.

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY no ambiente
const MODELO = 'claude-sonnet-4-6';

export async function extrairAporte(texto) {
  const res = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 200,
    system:
      'Você lê uma mensagem de WhatsApp de um cliente de uma agência de tráfego. ' +
      'Decida se é um pedido de aporte (quanto ele quer investir em anúncios) e extraia o valor em reais. ' +
      'Responda SÓ com JSON, sem texto nem markdown: {"ehAporte":boolean,"valor":number|null,"confianca":number}. ' +
      'confianca entre 0 e 1. Se não for sobre investir/valor, ehAporte=false.',
    messages: [{ role: 'user', content: texto }],
  });

  const txt = res.content.find((b) => b.type === 'text')?.text ?? '{}';
  try {
    return JSON.parse(txt.replace(/```json|```/g, '').trim());
  } catch {
    return { ehAporte: false, valor: null, confianca: 0 };
  }
}
