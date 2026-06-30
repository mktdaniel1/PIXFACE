// src/clientes.js — ADAPTER. Resolva remetente/grupo → conta de anúncios.
// Em produção: consulta no seu Postgres (você já cataloga as ~190 contas).
// Deve devolver { nome, businessId, adAccountId } ou null.
export async function clientePorRemetente(remetente) {
  // TODO: SELECT ... FROM clientes WHERE telefone = $1 (ou pelo grupo)
  // Stub de exemplo:
  const MAPA = {
    '5511999990000': { nome: 'Lótus Assessoria', businessId: '000', adAccountId: 'act_000' },
  };
  return MAPA[remetente] ?? null;
}
