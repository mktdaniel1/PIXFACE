// src/salvarSessao.js
// Rode UMA VEZ, LOCALMENTE, para logar à mão (com 2FA) e salvar a sessão.
// Depois o agent reusa esses cookies. Trate o arquivo de sessão como SENHA:
// quem o tiver acessa suas contas. Criptografe em repouso e restrinja o servidor.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SESSION_PATH = process.env.META_SESSION_PATH || './session/meta.json';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ locale: 'pt-BR' });
const page = await context.newPage();

await page.goto('https://business.facebook.com/');
console.log('→ Faça login + 2FA na janela aberta. Depois volte aqui e tecle ENTER.');
process.stdin.resume();
await new Promise((r) => process.stdin.once('data', r));

fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
await context.storageState({ path: SESSION_PATH });
console.log('✓ Sessão salva em', SESSION_PATH);
await browser.close();
process.exit(0);
