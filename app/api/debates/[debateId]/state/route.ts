import { NextRequest, NextResponse } from 'next/server'
import { DebateStatus } from '@prisma/client'
import { getCurrentUserFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stateSchema } from '@/lib/validation'

type RouteParams = {
  debateId: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId } = await params
  const payload = await request.json().catch(() => null)
  const parsed = stateSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: '状态更新不完整' }, { status: 400 })
  }

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
      currentTopic: true,
    },
  })

  if (!debate) {
    return NextResponse.json({ error: '找不到辩论会' }, { status: 404 })
  }

  const updateData: {
    status?: DebateStatus
    currentTopicId?: string | null
  } = {}

  if (parsed.data.status) {
    updateData.status = parsed.data.status as DebateStatus
  }

  if (parsed.data.currentTopicId !== undefined) {
    if (parsed.data.currentTopicId !== null && !debate.topics.some((topic) => topic.id === parsed.data.currentTopicId)) {
      return NextResponse.json({ error: '辩题不属于当前辩论会' }, { status: 400 })
    }

    updateData.currentTopicId = parsed.data.currentTopicId

    if (!updateData.status) {
      updateData.status = DebateStatus.LIVE
    }
  }

  if (updateData.status === DebateStatus.LIVE && updateData.currentTopicId === undefined && !debate.currentTopicId) {
    updateData.currentTopicId = debate.topics[0]?.id ?? null
  }

  const updated = await prisma.debate.update({
    where: {
      id: debateId,
    },
    data: updateData,
    include: {
      topics: {
        orderBy: {
          position: 'asc',
        },
      },
      currentTopic: true,
    },
  })

  return NextResponse.json({ debate: updated })
}

