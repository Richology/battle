import QRCode from 'qrcode'

export async function buildQrSvg(text: string, size = 168) {
  return QRCode.toString(text, {
    type: 'svg',
    width: size,
    margin: 1,
    color: {
      dark: '#111111',
      light: '#00000000',
    },
  })
}
