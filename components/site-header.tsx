import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth';
import { getOwnerDebates } from '@/lib/debate';

import { Badge } from './ui';
import { LogoutButton } from './logout-button';

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
            <strong>分晓</strong>
            <span>观点上场，投票见分晓</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="站点导航">
          <Link href="/">首页</Link>
          <Link href="/dashboard">活动台</Link>
          {!session ? <Link href="/login">登录</Link> : null}
          {!session ? <Link href="/register">注册</Link> : null}
          {primaryDebate ? <Link href={`/stage/${primaryDebate.publicToken}`}>现场页</Link> : null}
          {primaryDebate ? <Link href={`/vote/${primaryDebate.publicToken}`}>投票页</Link> : null}
        </nav>

        <div className="site-header__meta">
          <Badge tone={session ? 'success' : 'warn'}>
            {session ? session.email : '游客'}
          </Badge>
          <span className="site-header__status">
            {session
              ? primaryDebate
                ? primaryDebate.title
                : '还没有活动'
              : '请先登录或注册'}
          </span>
          <div className="site-header__actions">
            <Link className="ui-button ui-button--outline ui-button--sm" href={session ? '/dashboard' : '/login'}>
              {session ? '进入活动台' : '前往登录'}
            </Link>
            {session ? <LogoutButton /> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
