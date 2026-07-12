import { jsonError, jsonOk } from "@/lib/api";
import { runFullReview } from "@/features/resume/services/resume-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const analysis = await runFullReview(id);
    return jsonOk(analysis, 201);
  } catch (error) {
    return jsonError(error);
  }
}
