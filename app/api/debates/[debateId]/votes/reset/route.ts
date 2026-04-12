import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/lib/auth';
import { resetCurrentRoundVotes } from '@/lib/debate';
import { apiError, parseJsonBody, route } from '@/lib/http';
import { resetVotesSchema } from '@/lib/schemas';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    debateId: string;
  }>;
};

export const POST = route(async (request: Request, { params }: RouteContext) => {
  const user = await requireCurrentUser();
  const { debateId } = await params;
  const body = await parseJsonBody(request, resetVotesSchema);

  if (!body.confirm) {
    throw apiError(
      409,
      'CONFIRMATION_REQUIRED',
      'Re-send the request with confirm=true to clear the active votes',
      { requiresConfirmation: true },
    );
  }

  const result = await resetCurrentRoundVotes(user.id, debateId);

  return NextResponse.json({ result });
});
