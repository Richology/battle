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
            B
          </span>
          <span className="site-brand__copy">
            <strong>Battle</strong>
            <span>Structured Thinking × AI</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="站点导航">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Workspace</Link>
          {!session ? <Link href="/login">Log in</Link> : null}
          {!session ? <Link href="/register">Sign up</Link> : null}
          {primaryDebate ? <Link href={`/stage/${primaryDebate.publicToken}`}>Stage</Link> : null}
          {primaryDebate ? <Link href={`/vote/${primaryDebate.publicToken}`}>Vote</Link> : null}
        </nav>

        <div className="site-header__meta">
          <Badge tone={session ? 'success' : 'warn'}>
            {session ? session.email : 'Guest'}
          </Badge>
          <span className="site-header__status">
            {session
              ? primaryDebate
                ? primaryDebate.title
                : 'No workspace yet'
              : 'Log in or sign up'}
          </span>
          <div className="site-header__actions">
            <Link className="ui-button ui-button--outline ui-button--sm" href={session ? '/dashboard' : '/login'}>
              {session ? 'Enter workspace' : 'Get started'}
            </Link>
            {session ? <LogoutButton /> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
