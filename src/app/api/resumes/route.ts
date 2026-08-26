import { latestScoredAnalysis } from "@/features/resume/services/analysis-selection";
import { jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const resumes = await db.resume.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: latestScoredAnalysis,
        _count: { select: { skills: true, analyses: true } },
      },
    });

    return jsonOk(resumes);
  } catch (error) {
    return jsonError(error);
  }
}
