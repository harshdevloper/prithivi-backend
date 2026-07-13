import { z } from "zod";
import { publicUserSchema } from "../../users/schemas/users.schema.js";

export const firebaseSignInSchema = z.object({
  idToken: z.string().min(10),
});
export type FirebaseSignInInput = z.infer<typeof firebaseSignInSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const webCodeExchangeSchema = z.object({
  // ponytail: any non-empty string is "a code"; malformed ones miss redis and 401 like expired ones
  code: z.string().min(1).max(128),
});
export type WebCodeExchangeInput = z.infer<typeof webCodeExchangeSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: publicUserSchema,
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

/** /auth/firebase only: isNewUser drives the app's onboarding flow. */
export const firebaseAuthResultSchema = authTokensSchema.extend({
  isNewUser: z.boolean(),
});
export type FirebaseAuthResult = z.infer<typeof firebaseAuthResultSchema>;
