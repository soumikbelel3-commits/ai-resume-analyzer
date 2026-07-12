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

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export function isAcceptedMimeType(mimeType: string) {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);
}
