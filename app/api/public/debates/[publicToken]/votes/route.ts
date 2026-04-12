import { NextResponse } from 'next/server';

import { submitPublicVote } from '@/lib/debate';
import { parseJsonBody, route } from '@/lib/http';
import { voteSchema } from '@/lib/schemas';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    publicToken: string;
  }>;
};

export const POST = route(async (request: Request, { params }: RouteContext) => {
  const { publicToken } = await params;
  const body = await parseJsonBody(request, voteSchema);
  const vote = await submitPublicVote(publicToken, body);

  return NextResponse.json(vote);
});
