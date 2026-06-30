// src/cs-alerta.js — ADAPTER. A CS vira EXCEÇÃO: só é acionada aqui.
// Ligue num canal de Slack ou numa conversa interna do Pulso.
export async function escalarParaCs(info) {
  // TODO: postar no Slack/Pulso para um humano tratar.
  console.warn('[CS escalação]', JSON.stringify(info));
}
