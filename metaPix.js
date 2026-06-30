// src/metaPix.js
// Camada RPA: dirige o Ads Manager e captura APENAS o copia-e-cola gerado pela Meta.
// O QR é renderizado depois, localmente, a partir desse código (ver qr.js).
//
// IMPORTANTE: os seletores abaixo são ponto de partida. A UI do Meta muda com
// frequência e tem testes A/B — valide/ajuste contra o DOM real (rode headless:false
// na 1a vez para inspecionar). Faça o agent FALHAR ALTO se não achar o código.

import { chromium } from 'playwright';
import fs from 'node:fs';

const SESSION_PATH = process.env.META_SESSION_PATH || './session/meta.json';

/**
 * Gera (NÃO paga) um Pix de aporte pré-pago e devolve o copia-e-cola.
 * @returns {Promise<{copiaECola:string, valorSolicitado:number, screenshot:string}>}
 */
export async function gerarPixMeta({ businessId, adAccountId, valorBruto }) {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error(`Sessão ausente em ${SESSION_PATH}. Rode "node salvarSessao.js" uma vez.`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: SESSION_PATH,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();

  try {
    // 1) Central de cobrança da conta específica
    const url = `https://business.facebook.com/billing_hub/accounts/details?asset_id=${adAccountId}&business_id=${businessId}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // Sessão expirada/checkpoint → falha alto (não tenta logar sozinho)
    if (/login|checkpoint/.test(page.url())) {
      throw new Error('Sessão expirada/checkpoint. Rode salvarSessao.js de novo.');
    }

    // 2) "Adicionar fundos" / "Adicionar dinheiro" (varia PT/EN e por A/B test)
    await page.getByRole('button', { name: /adicionar (fundos|dinheiro)/i }).click();

    // 3) Valor
    await page.getByLabel(/valor|quantia/i).fill(String(valorBruto));

    // 4) Pix como forma de pagamento
    await page.getByText(/pix/i).first().click();

    // 5) Confirma a EMISSÃO da cobrança (gera o Pix — não paga)
    await page.getByRole('button', { name: /(gerar|continuar|adicionar)/i }).click();

    // 6) Captura o copia-e-cola (EMV do Pix começa com "00020126...")
    const copiaECola = await page
      .locator('[data-testid="pix-copy-paste"], textarea[readonly], input[readonly]')
      .first()
      .inputValue()
      .catch(() => page.getByText(/^00020126/).first().innerText());

    if (!copiaECola || !/^000201/.test(copiaECola.trim())) {
      throw new Error('Não encontrei o copia-e-cola na tela. Reveja os seletores.');
    }

    const screenshot = (await page.screenshot()).toString('base64'); // auditoria
    return { copiaECola: copiaECola.trim(), valorSolicitado: valorBruto, screenshot };
  } finally {
    await context.close();
    await browser.close();
  }
}
