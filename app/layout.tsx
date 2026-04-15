import type { Metadata } from 'next';
import { Inter, Manrope, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';

import './globals.css';
import './arena-theme.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: '分晓 | 观点上场，投票见分晓',
  description: '创建辩论会、配置题目、分享现场页、扫码投票并生成结果。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${manrope.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <SiteHeader />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
