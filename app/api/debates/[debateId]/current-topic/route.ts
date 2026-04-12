import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/lib/auth';
import { setCurrentTopic } from '@/lib/debate';
import { currentTopicSchema } from '@/lib/schemas';
import { parseJsonBody, route } from '@/lib/http';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    debateId: string;
  }>;
};

export const POST = route(async (request: Request, { params }: RouteContext) => {
  const user = await requireCurrentUser();
  const { debateId } = await params;
  const body = await parseJsonBody(request, currentTopicSchema);
  const debate = await setCurrentTopic(user.id, debateId, body.topicId);

  return NextResponse.json({ debate });
});
