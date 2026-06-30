# Guia de implantação — Agent de aporte (WhatsApp → Meta → Slack)

Automatiza o ciclo de aporte: o cliente responde um valor no WhatsApp, o agent
gera o Pix pré-pago na conta de anúncios da Meta e o código cai no Slack pra CS
encaminhar. Ninguém move dinheiro — a Meta só **emite** a cobrança; o cliente paga.

```
disparo WhatsApp (2chat)
  → cliente responde "quero 800"
  → Claude extrai o valor e identifica a conta (ID, nome)
  → Playwright gera o Pix na Meta (copia e cola)
  → código no canal do Slack (conta, ID, valor)
  → CS encaminha ao cliente
```

---

## Arquivos do projeto

| Arquivo | Papel |
|---|---|
| `src/server.js` | Recebe o webhook do 2chat e o teste manual |
| `src/orquestrador.js` | Identifica o cliente, extrai o valor, decide gerar ou escalar |
| `src/extrair.js` | Claude lê a mensagem livre e tira o valor (mil, 1k, R$ 1.500,00) |
| `src/fila.js` | Fila serializada: gera os Pix um de cada vez e posta no Slack |
| `src/metaPix.js` | Playwright dirige o Ads Manager e captura o copia-e-cola |
| `src/qr.js` | Renderiza o QR localmente a partir do copia-e-cola (opcional) |
| `src/slack.js` | Posta o resultado no canal da CS (Incoming Webhook) |
| `src/clientes.js` | Mapa remetente → conta (ligue no seu Postgres) |
| `src/cs-alerta.js` | Escalações pra CS (ambiguidade, erro) |
| `src/salvarSessao.js` | Login manual único que salva a sessão da Meta |
| `Dockerfile` | Imagem com Chromium + dependências pro Railway |

---

## Pré-requisitos

- Node 18+ na sua máquina
- Contas: GitHub, Railway, Slack (admin do workspace), 2chat, Meta Business com Pix pré-pago habilitado
- API key da Anthropic

---

## Passo a passo

### 1. Subir no GitHub
```bash
cd meta-pix-agent
git init && git add . && git commit -m "agent de aporte"
gh repo create growper/meta-pix-agent --private --source=. --push
```
O `.gitignore` já protege `node_modules/`, `.env` e `src/session/` — nunca suba a sessão da Meta.

### 2. Gerar a API key da Anthropic
Em console.anthropic.com → API keys → crie uma. Guarde pra colar como `ANTHROPIC_API_KEY` no passo 6.

### 3. Criar o webhook do Slack
api.slack.com/apps → **Create New App** → From scratch → escolha o workspace.
Ative **Incoming Webhooks** → **Add New Webhook to Workspace** → selecione o canal da CS → copie a URL (`https://hooks.slack.com/services/...`). Vai em `SLACK_WEBHOOK_URL`.

### 4. Gerar a sessão da Meta (faça localmente)
```bash
npm install
npx playwright install chromium
npm run sessao        # abre o navegador → você loga com 2FA → salva src/session/meta.json
```
Esse `meta.json` dá acesso às contas: trate como senha. Ele sobe pro Railway (passo 6), **nunca pro Git**.

### 5. Apontar o webhook do 2chat
No painel do 2chat, configure o webhook de **mensagens recebidas** para:
```
https://SEU-APP.up.railway.app/webhook/2chat
```
(O disparo de saída você já tem. A `TWO_CHAT_API_KEY` é a mesma do Pulso.)
Você só terá a URL real depois do deploy — volte aqui no fim do passo 6.

### 6. Deploy no Railway
1. **New Project → Deploy from GitHub repo** → escolha o repo.
2. O Railway detecta o `Dockerfile` (imagem oficial do Playwright) e builda por ele.
3. Em **Variables**, configure (veja a tabela abaixo).
4. Em **Volumes**, adicione um volume montado em `/data` e suba o `meta.json` pra lá.
5. Deploy → copie a URL pública e cole no webhook do 2chat (passo 5).

### 7. Ligar o mapa de contas
Edite `src/clientes.js` para consultar seu Postgres e devolver `{ nome, businessId, adAccountId }`
a partir do telefone/grupo do remetente (as ~190 contas que você já cataloga).

### 8. Testar isolado (sem o 2chat)
```bash
curl -X POST https://SEU-APP.up.railway.app/test \
  -H 'content-type: application/json' \
  -d '{"texto":"quero investir 500"}'
```
O código deve aparecer no canal do Slack. Confira também `GET /health`.

### 9. Virar a chave
Com o teste passando, aponte o webhook do 2chat e mande um disparo real.

---

## Variáveis de ambiente

| Variável | De onde vem |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com (passo 2) |
| `SLACK_WEBHOOK_URL` | Incoming Webhook do Slack (passo 3) |
| `TWO_CHAT_API_KEY` | painel do 2chat (a mesma do Pulso) |
| `TWO_CHAT_CHANNEL` | seu número/canal de envio no 2chat |
| `META_SESSION_PATH` | `/data/meta.json` (caminho no volume do Railway) |
| `PORT` | `3000` (o Railway injeta automaticamente em produção) |

---

## Solução de problemas

- **Meta pede checkpoint / cai no login.** O `meta.json` foi gerado no seu IP e está
  rodando do IP do Railway (datacenter). Rode o RPA atrás de um proxy residencial fixo,
  ou de um IP estável. Refaça `npm run sessao` e re-suba o `meta.json` no volume.
- **Nada chega no Slack.** Confira `SLACK_WEBHOOK_URL` e se o app do Slack está instalado
  no canal certo. Teste com o `curl` do passo 8.
- **Seletores quebrados (não acha "adicionar fundos"/valor/Pix).** A Meta mudou a UI.
  Rode `metaPix.js` com `headless: false` localmente e ajuste os três cliques.
- **Pico depois do disparo.** Mantenha a fila serializada (1–2 por vez). Abrir sessões
  Playwright em paralelo no mesmo login é o caminho mais rápido pro bloqueio.
- **Valor vindo estranho ("uns 800", "mil e meio").** O `extrair.js` resolve a maioria;
  quando a confiança é baixa, cai como escalação pra CS (não gera sozinho).

---

## Checklist final

- [ ] Repo no GitHub (privado), sessão e `.env` fora do Git
- [ ] `ANTHROPIC_API_KEY` criada
- [ ] Webhook do Slack apontando pro canal da CS
- [ ] `meta.json` gerado localmente e subido no volume `/data`
- [ ] Variáveis configuradas no Railway
- [ ] `clientes.js` ligado ao Postgres
- [ ] Teste `/test` derrubando o código no Slack
- [ ] Webhook do 2chat apontado pra `/webhook/2chat`

---

## Lembretes que valem ouro

- **Sessão = senha.** Quem tiver o `meta.json` acessa as contas. Volume restrito, nunca no Git.
- **O copia-e-cola é o entregável.** Mande sempre o texto; o QR é bônus.
- **Gross-up do imposto.** Pré-pago desconta ~12,15% na entrada (jan/2026). O `imposto.js`
  já compensa — valide a alíquota na sua fatura real.
- **ToS da Meta.** Automação de navegador em 190 contas tem risco de flag. Ritmo humano,
  baixa frequência, e comece com a CS na malha antes de soltar no automático.
