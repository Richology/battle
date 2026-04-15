'use client';

import Link from 'next/link';

import { Badge, Button, Panel } from './ui';
import { QRCodeCard } from './qr-code';

export function EntryScreen() {
  return (
    <main className="entry-screen page-shell">
      <section className="entry-screen__hero">
        <Badge tone="hot">分晓</Badge>
        <h1>观点上场，投票见分晓。</h1>
        <p>
          创建辩论会、配置题目、展示现场页、让观众扫码投票，最后一键生成结果。
        </p>

        <div className="entry-screen__actions">
          <Link className="ui-button ui-button--solid" href="/dashboard">
            进入活动台
          </Link>
          <Link className="ui-button ui-button--outline" href="/login">
            登录
          </Link>
          <Link className="ui-button ui-button--outline" href="/register">
            注册
          </Link>
        </div>

        <div className="entry-screen__chips" aria-label="核心能力">
          <Badge tone="pro">创建辩论会</Badge>
          <Badge tone="neutral">整理观点</Badge>
          <Badge tone="con">扫码投票</Badge>
          <Badge tone="warn">生成结果</Badge>
        </div>
      </section>

      <Panel className="entry-screen__panel">
        <div className="entry-screen__panel-header">
          <Badge tone="neutral">现场预览</Badge>
          <span>首页预览</span>
        </div>

        <div className="monitor-copy">
          <strong>现场大屏预览</strong>
          <p>正反双方观点、投票二维码和实时结果，会在现场页里一起出现。</p>
        </div>

        <QRCodeCard url="/login" label="投票入口" className="monitor-qr" />

        <div className="monitor-stats">
          <div>
            <span>适合场景</span>
            <strong>辩论会 / 互动活动</strong>
          </div>
          <div>
            <span>登录方式</span>
            <strong>邮箱 / 密码</strong>
          </div>
          <div>
            <span>观众投票</span>
            <strong>扫码即投，无需登录</strong>
          </div>
        </div>

        <div className="entry-screen__links">
          <Link href="/login">登录页</Link>
          <Link href="/register">注册页</Link>
          <Link href="/dashboard">查看活动台</Link>
        </div>
      </Panel>
    </main>
  );
}
