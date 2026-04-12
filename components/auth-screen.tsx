'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Panel, TextField } from './ui';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);

    const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? '操作失败。');
      setBusy(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="auth-screen page-shell">
      <section className="auth-screen__intro">
        <Badge tone="hot">{mode === 'login' ? '登录' : '注册'}</Badge>
        <h1>{mode === 'login' ? '进入你的辩论控制台' : '先创建邮箱账号，马上搭建辩论会'}</h1>
        <p>
          这次会真正把账号写进数据库。注册、登录、建题、投票和结算都走后端，不再依赖浏览器本地状态。
        </p>
        <div className="auth-screen__notes">
          <div>
            <strong>1.</strong>
            <span>邮箱注册与登录都会写入 SQLite 会话。</span>
          </div>
          <div>
            <strong>2.</strong>
            <span>登录后进入控制台创建辩论会和辩题。</span>
          </div>
          <div>
            <strong>3.</strong>
            <span>观众扫码进入投票页，现场大屏实时刷新。</span>
          </div>
        </div>
      </section>

      <Panel className="auth-screen__panel">
        <div className="auth-screen__panel-header">
          <Badge tone="neutral">{mode === 'login' ? '邮箱登录' : '注册账号'}</Badge>
          <span>数据库会话</span>
        </div>

        <form
          className="auth-screen__form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <TextField
            label="邮箱地址"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
          <TextField
            label="密码"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
          />

          {error ? <p className="form-error">{error}</p> : null}

          <div className="auth-screen__actions">
            <Button type="submit" disabled={busy}>
              {busy ? '处理中…' : mode === 'login' ? '登录并进入' : '注册并进入'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(mode === 'login' ? '/register' : '/login')}
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </Button>
          </div>
        </form>

        <div className="auth-screen__footer">
          <Link href="/">返回入口</Link>
          <Link href="/dashboard">直接看控制台</Link>
        </div>
      </Panel>
    </main>
  );
}
