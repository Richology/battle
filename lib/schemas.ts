import { z } from 'zod';

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

const textSchema = z.string().trim().min(1);

export const authRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const authLoginSchema = authRegisterSchema;

export const debateTopicSchema = z.object({
  title: textSchema,
  detail: textSchema,
  proView: textSchema,
  conView: textSchema,
  position: z.number().int().nonnegative().optional(),
});

export const debateCreateSchema = z.object({
  title: textSchema,
  theme: textSchema,
  topics: z.array(debateTopicSchema).min(1, 'At least one topic is required'),
});

export const debateUpdateSchema = z
  .object({
    title: textSchema.optional(),
    theme: textSchema.optional(),
  })
  .refine((value) => Boolean(value.title || value.theme), {
    message: 'At least one field must be updated',
  });

export const topicUpdateSchema = z
  .object({
    title: textSchema.optional(),
    detail: textSchema.optional(),
    proView: textSchema.optional(),
    conView: textSchema.optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.title ||
          value.detail ||
          value.proView ||
          value.conView ||
          value.position !== undefined,
      ),
    {
      message: 'At least one field must be updated',
    },
  );

export const currentTopicSchema = z.object({
  topicId: z.string().min(1).nullable(),
});

export const voteSchema = z.object({
  voterKey: z.string().trim().min(8),
  side: z.enum(['PRO', 'CON']),
  topicId: z.string().min(1).optional(),
});

export const resetVotesSchema = z.object({
  confirm: z.boolean().optional().default(false),
});
