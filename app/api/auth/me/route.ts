import { getCurrentUser } from '@/lib/auth';
import { ok, route } from '@/lib/http';

export const runtime = 'nodejs';

export const GET = route(async () => {
  const user = await getCurrentUser();
  return ok({ user });
});
