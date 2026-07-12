import { jsonError, jsonOk, AppError } from "@/lib/api";
import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const resume = await db.resume.findUnique({
      where: { id },
      include: {
        analyses: { orderBy: { createdAt: "desc" } },
        skills: { orderBy: { name: "asc" } },
        jobDescriptions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!resume) throw new AppError("Resume not found", 404, "NOT_FOUND");
    return jsonOk(resume);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const resume = await db.resume.findUnique({ where: { id } });
    if (!resume) throw new AppError("Resume not found", 404, "NOT_FOUND");

    await deleteUpload(resume.storagePath);
    await db.resume.delete({ where: { id } });
    return jsonOk({ id });
  } catch (error) {
    return jsonError(error);
  }
}
