import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  VERCEL_REQUEST_BODY_LIMIT_BYTES,
  isAcceptedMimeType,
} from "@/lib/upload-limits";

describe("upload limits", () => {
  it("stays under Vercel's request body ceiling", () => {
    // The app advertised 5MB against a 4.5MB platform limit, so large uploads
    // died with an opaque 413 before any of the app's error handling ran.
    expect(MAX_UPLOAD_BYTES).toBeLessThan(VERCEL_REQUEST_BODY_LIMIT_BYTES);
  });

  it("leaves headroom for multipart encoding overhead", () => {
    const headroom = VERCEL_REQUEST_BODY_LIMIT_BYTES - MAX_UPLOAD_BYTES;
    expect(headroom).toBeGreaterThanOrEqual(256 * 1024);
  });

  it("accepts PDF and DOCX only", () => {
    expect(isAcceptedMimeType("application/pdf")).toBe(true);
    expect(
      isAcceptedMimeType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(isAcceptedMimeType("image/png")).toBe(false);
  });
});
