import { jsonError, jsonOk } from "@/lib/api";
import { runBulletOptimize } from "@/features/resume/services/resume-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await runBulletOptimize(id);
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
