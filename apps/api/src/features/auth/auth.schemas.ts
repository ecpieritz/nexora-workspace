import { Buffer } from 'node:buffer';

import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, { error: 'Password must contain at least 8 characters.' })
  .max(72, { error: 'Password must contain at most 72 characters.' })
  .regex(/[a-z]/, { error: 'Password must contain a lowercase letter.' })
  .regex(/[A-Z]/, { error: 'Password must contain an uppercase letter.' })
  .regex(/[0-9]/, { error: 'Password must contain a number.' })
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    error: 'Password must contain at most 72 UTF-8 bytes.',
  });

export const registerBodySchema = z.strictObject({
  fullName: z.string().trim().min(3).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Email must be valid.' })),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])$/, {
      error:
        'Username must start and end with a letter or number and may contain dots, hyphens or underscores.',
    }),
  password: passwordSchema,
});

export const loginBodySchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Email must be valid.' })),
  password: z
    .string()
    .min(1, { error: 'Password is required.' })
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      error: 'Password must contain at most 72 UTF-8 bytes.',
    }),
});

export const refreshTokenBodySchema = z.strictObject({
  refreshToken: z.string().min(32).max(256),
});

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenBodySchema>;
