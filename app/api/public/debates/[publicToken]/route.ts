import { NextResponse } from 'next/server';

import { getDebateForPublic } from '@/lib/debate';
import { route } from '@/lib/http';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    publicToken: string;
  }>;
};

export const GET = route(async (_request: Request, { params }: RouteContext) => {
  const { publicToken } = await params;
  const debate = await getDebateForPublic(publicToken);

  return NextResponse.json({ debate });
});
