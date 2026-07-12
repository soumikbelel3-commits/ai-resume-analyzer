import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import type { z } from "zod";

function getApiKey(): string | null {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key || key === "your_gemini_api_key_here" || key.trim().length < 10) {
    return null;
  }
  return key;
}

export function isAiConfigured(): boolean {
  return getApiKey() !== null;
}

export function getGoogleModel(modelId = "gemini-2.0-flash") {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add a free key from https://aistudio.google.com",
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}

export async function generateStructured<T extends z.ZodType>(options: {
  schema: T;
  system: string;
  prompt: string;
}): Promise<z.infer<T>> {
  const { object } = await generateObject({
    model: getGoogleModel(),
    schema: options.schema,
    system: options.system,
    prompt: options.prompt,
  });

  return object as z.infer<T>;
}

export async function generatePlainText(options: {
  system: string;
  prompt: string;
}): Promise<string> {
  const { text } = await generateText({
    model: getGoogleModel(),
    system: options.system,
    prompt: options.prompt,
  });

  return text;
}
