import { z } from 'zod'

export const authSchema = z.object({
  email: z.string().trim().email('请输入有效邮箱').transform((value) => value.toLowerCase()),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码过长'),
})

export const registerSchema = authSchema
export const loginSchema = authSchema

export const topicDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, '辩题标题至少 2 个字').max(120, '辩题标题过长'),
  detail: z.string().trim().min(8, '介绍至少 8 个字').max(500, '介绍过长'),
  proView: z.string().trim().min(8, '正方观点至少 8 个字').max(500, '正方观点过长'),
  conView: z.string().trim().min(8, '反方观点至少 8 个字').max(500, '反方观点过长'),
  position: z.number().int().nonnegative().optional(),
})

export const createDebateSchema = z.object({
  title: z.string().trim().min(2, '辩论会名称至少 2 个字').max(120, '名称过长'),
  theme: z.string().trim().min(2, '主题至少 2 个字').max(160, '主题过长'),
  topics: z.array(topicDraftSchema).min(1, '至少需要一个辩题'),
})

export const updateDebateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  theme: z.string().trim().min(2).max(160).optional(),
})

export const updateTopicSchema = topicDraftSchema.pick({
  title: true,
  detail: true,
  proView: true,
  conView: true,
  position: true,
})

export const voteSchema = z.object({
  side: z.enum(['PRO', 'CON']),
  voterKey: z.string().trim().min(8, '缺少投票标识').max(160),
  topicId: z.string().trim().min(1).nullable().optional(),
})

export const stateSchema = z.object({
  status: z.enum(['DRAFT', 'LIVE', 'FINAL', 'ENDED']).optional(),
  currentTopicId: z.string().trim().min(1).nullable().optional(),
})

export type AuthInput = z.infer<typeof authSchema>
export type CreateDebateInput = z.infer<typeof createDebateSchema>
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>
export type VoteInput = z.infer<typeof voteSchema>
export type StateInput = z.infer<typeof stateSchema>
