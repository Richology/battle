import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserFromCookies } from '@/lib/auth';
import { buildStagePath, buildVotePath, createDebate, getOwnerDebates } from '@/lib/debate';
import { createDebateSchema } from '@/lib/validation';

type DebateCardSource = {
  id: string;
  publicToken: string;
  title: string;
  theme: string;
  status: Awaited<ReturnType<typeof getOwnerDebates>>[number]['status'];
  currentTopicId: string | null;
  currentTopic: { id: string; title: string } | null;
  topics: Array<unknown>;
  createdAt: Date;
  updatedAt: Date;
};

function toDebateCard(debate: DebateCardSource) {
  return {
    id: debate.id,
    publicToken: debate.publicToken,
    title: debate.title,
    theme: debate.theme,
    status: debate.status,
    currentTopicId: debate.currentTopicId,
    currentTopic: debate.currentTopic
      ? {
          id: debate.currentTopic.id,
          title: debate.currentTopic.title,
        }
      : null,
    topicCount: debate.topics.length,
    stagePath: buildStagePath(debate.publicToken),
    votePath: buildVotePath(debate.publicToken),
    createdAt: debate.createdAt,
    updatedAt: debate.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromCookies(request.cookies);

  if (!user) {
    return NextResponse.json(
      {
        error: '未登录',
      },
      { status: 401 },
    );
  }

  const debates = await getOwnerDebates(user.id);
  return NextResponse.json({
    debates: debates.map(toDebateCard),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromCookies(request.cookies);

  if (!user) {
    return NextResponse.json(
      {
        error: '未登录',
      },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = createDebateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '辩论会内容不完整',
      },
      { status: 400 },
    );
  }

  const created = await createDebate(user.id, parsed.data);
  return NextResponse.json(
    {
      debate: {
        ...toDebateCard(created),
        topics: created.topics,
        currentTopic: created.currentTopic,
      },
    },
    { status: 201 },
  );
}
