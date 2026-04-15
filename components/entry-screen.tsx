'use client';

import Link from 'next/link';

import { Badge, Button, Panel } from './ui';
import { QRCodeCard } from './qr-code';

export function EntryScreen() {
  return (
    <main className="entry-screen page-shell">
      <section className="entry-screen__hero">
        <Badge tone="hot">THE ARENA</Badge>
        <h1>把邮箱登录、辩题编排、扫码投票和终局结算放进同一个战场。</h1>
        <p>
          注册后会真正写入数据库。你可以创建辩论会、添加辩题、切换当前题、清空投票并生成最终结果。
        </p>

        <div className="entry-screen__actions">
          <Link className="ui-button ui-button--solid" href="/dashboard">
            进入工作台
          </Link>
          <Link className="ui-button ui-button--outline" href="/login">
            登录
          </Link>
          <Link className="ui-button ui-button--outline" href="/register">
            注册
          </Link>
        </div>

        <div className="entry-screen__chips" aria-label="核心能力">
          <Badge tone="pro">邮箱注册 / 登录</Badge>
          <Badge tone="neutral">多辩题编排</Badge>
          <Badge tone="con">二维码投票</Badge>
          <Badge tone="warn">终局投票</Badge>
        </div>
      </section>

      <Panel className="entry-screen__panel">
        <div className="entry-screen__panel-header">
          <Badge tone="neutral">现场预演</Badge>
          <span>首页预览</span>
        </div>

        <div className="monitor-copy">
          <strong>蓝红对抗视图</strong>
          <p>深色战场、双栏观点卡和中心二维码，用来提前看最终大屏的节奏。</p>
        </div>

        <QRCodeCard url="/login" label="投票入口预览" className="monitor-qr" />

        <div className="monitor-stats">
          <div>
            <span>部署目标</span>
            <strong>前后端连通</strong>
          </div>
          <div>
            <span>登录方式</span>
            <strong>邮箱 / 密码</strong>
          </div>
          <div>
            <span>观众投票</span>
            <strong>扫码即投</strong>
          </div>
        </div>

        <div className="entry-screen__links">
          <Link href="/login">专门的登录页</Link>
          <Link href="/register">专门的注册页</Link>
          <Link href="/dashboard">直接看工作台</Link>
        </div>
      </Panel>
    </main>
  );
}
