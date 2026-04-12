declare module 'qrcode' {
  export type QRCodeRenderOptions = {
    type?: 'svg' | 'terminal';
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: {
      dark?: string;
      light?: string;
    };
  };

  export interface QRCodeStatic {
    toString(text: string, options?: QRCodeRenderOptions): Promise<string>;
    toDataURL(text: string, options?: QRCodeRenderOptions): Promise<string>;
  }

  const QRCode: QRCodeStatic;
  export default QRCode;
}
