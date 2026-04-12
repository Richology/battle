'use client';

import Link from 'next/link';

import { Badge, Button, Panel } from './ui';
import { QRCodeCard } from './qr-code';

export function EntryScreen() {
  return (
    <main className="entry-screen page-shell">
      <section className="entry-screen__hero">
        <Badge tone="hot">辩论会控制台</Badge>
        <h1>把邮箱登录、辩题编排、二维码投票和终局结算放到一块。</h1>
        <p>
          这是一个全栈练手项目。注册后会真正写入数据库，之后你可以创建辩论会、添加辩题、切换当前题、清票和生成最终结果。
        </p>

        <div className="entry-screen__actions">
          <Link className="ui-button ui-button--solid" href="/dashboard">
            进入控制台
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
          <Badge tone="neutral">示意舞台</Badge>
          <span>首页预览</span>
        </div>

        <div className="monitor-copy">
          <strong>现场大屏风格</strong>
          <p>暖色舞台背景、双栏观点卡和中间二维码，用来帮助你提前感受控制台的最终效果。</p>
        </div>

        <QRCodeCard url="/login" label="示意二维码" className="monitor-qr" />

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
            <strong>同设备可改票</strong>
          </div>
        </div>

        <div className="entry-screen__links">
          <Link href="/login">专门的登录页</Link>
          <Link href="/register">专门的注册页</Link>
          <Link href="/dashboard">直接看控制台</Link>
        </div>
      </Panel>
    </main>
  );
}
