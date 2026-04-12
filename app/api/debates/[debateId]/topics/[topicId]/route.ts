import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookies } from '@/lib/auth'
import { deleteTopic, updateTopic } from '@/lib/debate'
import { prisma } from '@/lib/prisma'
import { updateTopicSchema } from '@/lib/validation'

type RouteParams = {
  debateId: string
  topicId: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId, topicId } = await params
  const payload = await request.json().catch(() => null)
  const parsed = updateTopicSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: '辩题内容不完整' }, { status: 400 })
  }

  const topic = await updateTopic(user.id, debateId, topicId, parsed.data)

  if (!topic) {
    return NextResponse.json({ error: '找不到辩题' }, { status: 404 })
  }

  return NextResponse.json({ topic })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId, topicId } = await params
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

  if (debate.topics.length <= 1) {
    return NextResponse.json({ error: '至少保留一个辩题' }, { status: 409 })
  }

  const deleted = await deleteTopic(user.id, debateId, topicId)

  if (!deleted) {
    return NextResponse.json({ error: '找不到辩题' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

