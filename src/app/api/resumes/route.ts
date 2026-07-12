import { jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const resumes = await db.resume.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { skills: true, analyses: true } },
      },
    });

    return jsonOk(resumes);
  } catch (error) {
    return jsonError(error);
  }
}
