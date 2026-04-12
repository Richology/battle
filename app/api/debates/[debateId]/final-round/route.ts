import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/lib/auth';
import { moveDebateToFinalRound } from '@/lib/debate';
import { route } from '@/lib/http';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    debateId: string;
  }>;
};

export const POST = route(async (_request: Request, { params }: RouteContext) => {
  const user = await requireCurrentUser();
  const { debateId } = await params;
  const debate = await moveDebateToFinalRound(user.id, debateId);

  return NextResponse.json({ debate });
});
