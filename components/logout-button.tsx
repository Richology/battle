'use client';

import { useRouter } from 'next/navigation';

import { Button } from './ui';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <Button className={className} variant="outline" size="sm" onClick={() => void handleLogout()}>
      Log out
    </Button>
  );
}
