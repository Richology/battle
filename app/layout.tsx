import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';

import './globals.css';

export const metadata: Metadata = {
  title: 'Battle Debate Console',
  description: '一个用于辩论会编排、二维码投票和终局结算的控制台。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
