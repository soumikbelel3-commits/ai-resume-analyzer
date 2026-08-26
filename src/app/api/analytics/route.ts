import { latestScoredAnalysis } from "@/features/resume/services/analysis-selection";
import { jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const resumes = await db.resume.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        analyses: latestScoredAnalysis,
      },
    });

    const scoreHistory = resumes.map((resume) => ({
      id: resume.id,
      name: resume.originalName,
      version: resume.version,
      createdAt: resume.createdAt,
      score: resume.analyses[0]?.overallScore ?? null,
      status: resume.status,
    }));

    const scored = scoreHistory.filter((s) => s.score != null);
    const avgScore =
      scored.length === 0
        ? 0
        : scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length;

    return jsonOk({
      scoreHistory,
      totals: {
        resumes: resumes.length,
        analyzed: scored.length,
        averageScore: Math.round(avgScore),
        bestScore: scored.reduce((max, s) => Math.max(max, s.score ?? 0), 0),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
