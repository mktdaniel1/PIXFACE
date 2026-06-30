// src/qr.js
import QRCode from 'qrcode';

// Gera o PNG (data URI) do QR a partir do copia-e-cola (EMV brcode).
// Mais confiável que capturar a imagem renderizada pela Meta: o código já
// carrega tudo que o app do banco precisa.
export function renderizarQr(copiaECola) {
  return QRCode.toDataURL(copiaECola, { errorCorrectionLevel: 'M', margin: 1, width: 360 });
}
