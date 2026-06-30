// src/bootstrapSessao.js
// Railway não deixa subir arquivo direto no volume pelo painel. Então a gente injeta
// o meta.json como variável base64 (META_SESSION_B64) e grava no disco aqui, no boot.
// Importe ESTE arquivo na primeira linha do server.js: import './bootstrapSessao.js';

import fs from 'node:fs';
import path from 'node:path';

const destino = process.env.META_SESSION_PATH || '/data/meta.json';

if (process.env.META_SESSION_B64 && !fs.existsSync(destino)) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.from(process.env.META_SESSION_B64, 'base64'));
  console.log('Sessão da Meta gravada em', destino);
}
