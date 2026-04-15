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
        <h1>{mode === 'login' ? '欢迎回来，继续设置你的活动' : '创建账号，开始第一场辩论会'}</h1>
        <p>
          用邮箱登录后，你可以继续设置活动、补充题目、发布现场页，并收集观众投票。
        </p>
        <div className="auth-screen__notes">
          <div>
            <strong>1.</strong>
            <span>一个邮箱对应一个账号，配置会一直保留。</span>
          </div>
          <div>
            <strong>2.</strong>
            <span>先创建活动，再补充题目和双方观点。</span>
          </div>
          <div>
            <strong>3.</strong>
            <span>观众扫码就能投票，不需要登录。</span>
          </div>
        </div>
      </section>

      <Panel className="auth-screen__panel">
        <div className="auth-screen__panel-header">
          <Badge tone="neutral">{mode === 'login' ? '邮箱登录' : '注册账号'}</Badge>
          <span>账号入口</span>
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
          <Link href="/">返回首页</Link>
          <Link href="/dashboard">查看活动台</Link>
        </div>
      </Panel>
    </main>
  );
}
