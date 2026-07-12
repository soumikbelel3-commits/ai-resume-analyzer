import { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api";
import {
  createResumeFromUpload,
  parseAndAnalyzeResume,
} from "@/features/resume/services/resume-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return jsonError(new Error("Missing file upload"), 400);
    }

    const resume = await createResumeFromUpload(file);
    const analyzed = await parseAndAnalyzeResume(resume.id);

    return jsonOk(analyzed, 201);
  } catch (error) {
    return jsonError(error);
  }
}
