/**
 * Shared application-level TypeScript types.
 * Feature-specific types live under `src/features/<feature>/types`.
 */

export type ApiError = {
  message: string;
  code?: string;
};
