import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { jsonError, jsonOk, AppError } from "@/lib/api";
import { db } from "@/lib/db";
import type { ParsedResume } from "@/types/resume";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function toMarkdown(resume: {
  originalName: string;
  parsedData: ParsedResume | null;
  analyses: Array<{
    type: string;
    overallScore: number | null;
    matchPercentage: number | null;
    suggestions: unknown;
  }>;
}) {
  const parsed = resume.parsedData;
  const lines = [
    `# Resume Report: ${resume.originalName}`,
    "",
    `## Candidate`,
    `- Name: ${parsed?.name ?? "N/A"}`,
    `- Email: ${parsed?.email ?? "N/A"}`,
    `- Phone: ${parsed?.phone ?? "N/A"}`,
    "",
    `## Skills`,
    ...(parsed?.skills.map((s) => `- ${s}`) ?? ["- None detected"]),
    "",
    `## Analyses`,
  ];

  for (const analysis of resume.analyses) {
    lines.push(`### ${analysis.type}`);
    if (analysis.overallScore != null) {
      lines.push(`- ATS Score: ${analysis.overallScore}`);
    }
    if (analysis.matchPercentage != null) {
      lines.push(`- Match: ${analysis.matchPercentage}%`);
    }
    const suggestions = (analysis.suggestions as string[] | null) ?? [];
    for (const s of suggestions.slice(0, 8)) lines.push(`- ${s}`);
    lines.push("");
  }

  return lines.join("\n");
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";

    const resume = await db.resume.findUnique({
      where: { id },
      include: {
        analyses: { orderBy: { createdAt: "desc" } },
        skills: true,
      },
    });

    if (!resume) throw new AppError("Resume not found", 404, "NOT_FOUND");

    const payload = {
      ...resume,
      parsedData: resume.parsedData as ParsedResume | null,
    };

    if (format === "json") {
      return jsonOk(payload);
    }

    if (format === "markdown") {
      const markdown = toMarkdown(payload);
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="resume-report.md"`,
        },
      });
    }

    if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("AI Resume Analyzer Report", 14, 18);
      doc.setFontSize(11);
      doc.text(String(resume.originalName).slice(0, 80), 14, 28);
      doc.text(`Status: ${resume.status}`, 14, 36);

      const latestAts = resume.analyses.find((a) => a.overallScore != null);
      const parsed = resume.parsedData as ParsedResume | null;

      autoTable(doc, {
        startY: 44,
        head: [["Metric", "Value"]],
        body: [
          ["ATS Score", String(latestAts?.overallScore ?? "N/A")],
          ["Skills", String(resume.skills.length)],
          ["Analyses", String(resume.analyses.length)],
          ["Name", parsed?.name ?? "N/A"],
        ],
      });

      const suggestions =
        (latestAts?.suggestions as string[] | null)?.slice(0, 8) ?? [];

      const docWithTable = doc as jsPDF & {
        lastAutoTable?: { finalY: number };
      };

      if (suggestions.length) {
        autoTable(doc, {
          startY: (docWithTable.lastAutoTable?.finalY ?? 80) + 10,
          head: [["Suggestions"]],
          body: suggestions.map((s) => [s]),
        });
      }

      const arrayBuffer = doc.output("arraybuffer");
      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="resume-report.pdf"`,
        },
      });
    }

    throw new AppError("format must be json, markdown, or pdf");
  } catch (error) {
    return jsonError(error);
  }
}
