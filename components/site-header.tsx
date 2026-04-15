import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth';
import { getOwnerDebates } from '@/lib/debate';

import { Badge } from './ui';

export async function SiteHeader() {
  const session = await getCurrentUser();
  const debates = session ? await getOwnerDebates(session.id) : [];
  const primaryDebate = debates[0] ?? null;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" href="/">
          <span className="site-brand__mark" aria-hidden="true">
            ◇
          </span>
          <span className="site-brand__copy">
            <strong>THE ARENA</strong>
            <span>辩论会工作台</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="站点导航">
          <Link href="/">首页</Link>
          <Link href="/dashboard">工作台</Link>
          {!session ? <Link href="/login">登录</Link> : null}
          {!session ? <Link href="/register">注册</Link> : null}
          {primaryDebate ? <Link href={`/stage/${primaryDebate.publicToken}`}>舞台</Link> : null}
          {primaryDebate ? <Link href={`/vote/${primaryDebate.publicToken}`}>投票</Link> : null}
        </nav>

        <div className="site-header__meta">
          <Badge tone={session ? 'success' : 'warn'}>
            {session ? session.email : '访客模式'}
          </Badge>
          <span className="site-header__status">
            {session
              ? primaryDebate
                ? primaryDebate.title
                : '尚未创建辩论会'
              : '请先登录邮箱账号'}
          </span>
          <Link className="ui-button ui-button--outline ui-button--sm" href={session ? '/dashboard' : '/login'}>
            {session ? '进入工作台' : '开始登录'}
          </Link>
        </div>
      </div>
    </header>
  );
}
