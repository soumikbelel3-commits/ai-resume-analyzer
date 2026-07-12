import { jsonError, jsonOk, AppError } from "@/lib/api";
import { db } from "@/lib/db";
import { buildSkillsDashboard } from "@/features/skills/services/skills-dashboard";
import type { ParsedResume } from "@/types/resume";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const resume = await db.resume.findUnique({
      where: { id },
      include: {
        analyses: {
          where: { type: "JOB_MATCH" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!resume?.parsedData) {
      throw new AppError("Resume must be parsed first", 400, "NOT_PARSED");
    }

    const missing =
      (resume.analyses[0]?.missingSkills as string[] | null) ?? [];
    const data = buildSkillsDashboard(
      resume.parsedData as ParsedResume,
      missing,
    );

    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
