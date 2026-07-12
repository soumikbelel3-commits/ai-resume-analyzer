import "server-only";

import mammoth from "mammoth";

import { isAiConfigured, generateStructured } from "@/lib/ai";
import { parseResumeHeuristically } from "@/features/parser/services/heuristic-parser";
import { parsedResumeSchema, type ParsedResume } from "@/types/resume";

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import keeps pdfjs out of edge bundles and avoids SSR canvas issues.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n");
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractPdfText(buffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxText(buffer);
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}

async function parseWithAi(rawText: string): Promise<ParsedResume> {
  return generateStructured({
    schema: parsedResumeSchema,
    system:
      "You extract structured resume data. Return only facts present in the text. Use empty arrays when unknown.",
    prompt: `Extract structured resume JSON from the following resume text:\n\n${rawText.slice(0, 20000)}`,
  });
}

export async function parseResumeText(rawText: string): Promise<ParsedResume> {
  if (!rawText.trim()) {
    throw new Error("Resume text is empty — could not parse file contents.");
  }

  if (isAiConfigured()) {
    try {
      return await parseWithAi(rawText);
    } catch (error) {
      console.warn("AI parse failed, falling back to heuristic parser", error);
    }
  }

  return parseResumeHeuristically(rawText);
}
