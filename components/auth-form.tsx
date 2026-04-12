'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Badge, Panel, TextField } from './ui';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
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
      setError(payload?.error ?? '操作失败');
      setBusy(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Panel className="auth-form">
      <div className="auth-form__header">
        <Badge tone={mode === 'login' ? 'hot' : 'success'}>{mode === 'login' ? '邮箱登录' : '创建账号'}</Badge>
        <span>{mode === 'login' ? '返回已有工作区' : '开始搭建新的辩论会'}</span>
      </div>

      <form
        className="auth-form__body"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="邮箱"
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
          hint={mode === 'register' ? '注册后会立即登录。' : '登录后进入控制台。'}
        />

        {error ? <p className="form-error">{error}</p> : null}

        <div className="auth-form__actions">
          <Button type="submit" disabled={busy}>
            {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并进入'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(mode === 'login' ? '/register' : '/login')}>
            {mode === 'login' ? '去注册' : '去登录'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
