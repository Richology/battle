import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookies } from '@/lib/auth'
import { createTopic } from '@/lib/debate'
import { createDebateSchema, topicDraftSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  debateId: string
}

export async function GET(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId } = await params
  const debate = await prisma.debate.findFirst({
    where: {
      id: debateId,
      ownerId: user.id,
    },
    include: {
      topics: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  })

  if (!debate) {
    return NextResponse.json({ error: '找不到辩论会' }, { status: 404 })
  }

  return NextResponse.json({
    topics: debate.topics,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId } = await params
  const payload = await request.json().catch(() => null)
  const parsed = topicDraftSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: '辩题内容不完整' }, { status: 400 })
  }

  const topic = await createTopic(user.id, debateId, parsed.data)

  if (!topic) {
    return NextResponse.json({ error: '找不到辩论会' }, { status: 404 })
  }

  const debate = await prisma.debate.findUnique({
    where: {
      id: debateId,
    },
    include: {
      currentTopic: true,
      topics: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  })

  return NextResponse.json(
    {
      topic,
      debate,
    },
    { status: 201 },
  )
}

