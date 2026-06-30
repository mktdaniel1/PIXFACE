# Imagem oficial do Playwright já traz Chromium + dependências de sistema.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
CMD ["node", "server.js"]
