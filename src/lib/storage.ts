import "server-only";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export function getUploadPath(fileName: string) {
  return path.join(UPLOAD_DIR, fileName);
}

export async function saveUpload(
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  await ensureUploadDir();
  const fullPath = getUploadPath(fileName);
  await writeFile(fullPath, buffer);
  return fullPath;
}

export async function deleteUpload(storagePath: string) {
  try {
    await unlink(storagePath);
  } catch {
    // ignore missing files
  }
}

// Upload constraints live in `upload-limits` so the browser can read them too:
// this module is `server-only`, which is why the upload page previously kept
// its own hard-coded copy of the limit.
export {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  isAcceptedMimeType,
} from "@/lib/upload-limits";
