'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeCard({
  url,
  label,
  className,
}: {
  url: string;
  label: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const absoluteUrl = url.startsWith('http')
      ? url
      : typeof window !== 'undefined'
        ? `${window.location.origin}${url}`
        : url;

    QRCode.toDataURL(absoluteUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0b1326',
        light: '#eef2ff',
      },
    })
      .then((dataUrl) => {
        if (alive) {
          setSrc(dataUrl);
        }
      })
      .catch(() => {
        if (alive) {
          setSrc(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <figure className={className}>
      <div className="qr-card">
        <span className="qr-card__label">{label}</span>
        {src ? (
          <img className="qr-card__image" src={src} alt={`${label}二维码`} />
        ) : (
          <div className="qr-card__placeholder" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </figure>
  );
}
