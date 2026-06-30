// src/imposto.js
// Imposto repassado em pré-pago (Pix/boleto) desde jan/2026: ~12,15% deduzido na entrada.
// Valide a alíquota na sua fatura real.
export const ALIQUOTA = 0.1215;

// Quanto aportar (bruto) para sobrar `liquido` disponível p/ mídia.
export const grossUp = (liquido) => Math.ceil((liquido / (1 - ALIQUOTA)) * 100) / 100;

// Quanto sobra p/ mídia de um valor bruto aportado.
export const liquidoDe = (bruto) => Math.round(bruto * (1 - ALIQUOTA) * 100) / 100;
