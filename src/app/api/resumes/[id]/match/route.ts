import { z } from "zod";

import { jsonError, jsonOk, AppError } from "@/lib/api";
import { runJobMatch } from "@/features/resume/services/resume-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  jobText: z.string().min(40, "Job description is too short"),
  title: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const result = await runJobMatch(
      id,
      parsed.data.jobText,
      parsed.data.title,
    );
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
