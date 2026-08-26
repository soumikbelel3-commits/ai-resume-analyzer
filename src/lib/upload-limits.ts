/**
 * Upload constraints shared by the server and the browser.
 *
 * These live outside `storage.ts` because that module imports `server-only`,
 * so the upload page could not read them and hard-coded its own copy of the
 * limit instead. The two then disagreed with the platform — see below.
 */

/**
 * Vercel Functions reject a request body larger than 4.5 MB before the route
 * handler runs, returning an opaque `413 FUNCTION_PAYLOAD_TOO_LARGE` that the
 * app never sees.
 *
 * @see https://vercel.com/docs/functions/limitations#request-body-size
 */
export const VERCEL_REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;

/**
 * Held below the platform ceiling with room for multipart encoding overhead,
 * so a file at exactly the advertised limit still fits inside the request.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** For user-facing copy, so the number is never written out by hand. */
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isAcceptedMimeType(mimeType: string) {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);
}
