// metaPix.js — gera o Pix pré-pago na Meta e captura o copia-e-cola.
// Fluxo REAL (confirmado na UI de 2026):
//   billing hub → "Adicionar fundos" → "Outra" + Valor + PIX → "Avançar"
//   → redireciona pra facebook.dlocal.com → "Copie código" (copia-e-cola no clipboard)

import { chromium } from 'playwright';
import fs from 'node:fs';

const SESSION_PATH = process.env.META_SESSION_PATH || './session/meta.json';

export async function gerarPixMeta({ businessId, adAccountId, valorBruto, headless = true }) {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error(`Sessão ausente em ${SESSION_PATH}. Rode "node salvarSessao.js" uma vez.`);
  }
  const assetId = String(adAccountId).replace(/^act_/, ''); // billing hub usa o número puro

  const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 300 });
  const context = await browser.newContext({
    storageState: SESSION_PATH,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  try {
    const url = `https://business.facebook.com/billing_hub/accounts/details?asset_id=${assetId}&business_id=${businessId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    if (/login|checkpoint/.test(page.url())) {
      throw new Error('Sessão expirada/checkpoint (provável bloqueio pelo IP do Railway). Rode local ou via proxy residencial.');
    }

    // 1) Acha e abre "Adicionar fundos" (a página da Meta carrega em partes;
    //    procura o botão por vários nomes, com tempo generoso, e rola até ele)
    const botaoFundos = page.getByRole('button', { name: /adicionar (fundos|dinheiro|saldo)/i }).first();
    await botaoFundos.waitFor({ state: 'visible', timeout: 60000 });
    await botaoFundos.scrollIntoViewIfNeeded().catch(() => {});
    await botaoFundos.click();
    await page.getByText(/escolha o valor/i).waitFor({ timeout: 20000 });

    // 2) Valor customizado
    await page.getByRole('button', { name: /^outra$/i }).click().catch(() => {});
    const inteiro = Number.isInteger(Number(valorBruto));
    const valorFmt = inteiro ? String(valorBruto) : Number(valorBruto).toFixed(2).replace('.', ',');
    await page.getByLabel(/valor/i).first().fill(valorFmt);

    // 3) Garante Pix marcado
    await page.getByText(/^PIX$/).first().click().catch(() => {});

    // 4) Avançar → redireciona pra dlocal
    await page.getByRole('button', { name: /avançar/i }).click();
    await page.waitForURL(/dlocal\.com/i, { timeout: 40000 });

    // 5) Espera a tela do Pix e captura o copia-e-cola
    await page.getByRole('button', { name: /copie código/i }).waitFor({ timeout: 25000 });

    let copiaECola = await lerCodigoDoDom(page);
    if (!ehPix(copiaECola)) {
      await page.getByRole('button', { name: /copie código/i }).click();
      await page.waitForTimeout(700);
      copiaECola = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
    }
    if (!ehPix(copiaECola)) {
      throw new Error('Cheguei na tela do Pix (dlocal) mas não consegui capturar o copia-e-cola.');
    }

    const screenshot = (await page.screenshot()).toString('base64');
    return { copiaECola: copiaECola.trim(), valorSolicitado: valorBruto, screenshot };
  } finally {
    await context.close();
    await browser.close();
  }
}

const ehPix = (s) => typeof s === 'string' && /^000201/.test(s.trim());

async function lerCodigoDoDom(page) {
  return page.evaluate(() => {
    const vals = [...document.querySelectorAll('input,textarea')].map((e) => e.value);
    const fromInput = vals.find((v) => v && /^000201/.test(v));
    if (fromInput) return fromInput;
    const m = document.body.innerText.match(/000201[0-9A-Za-z+/=.\-]{20,}/);
    return m ? m[0] : null;
  });
}
