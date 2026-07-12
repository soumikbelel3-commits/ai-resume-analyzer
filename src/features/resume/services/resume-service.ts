import "server-only";

import { SkillCategory, type Prisma } from "@prisma/client";

import { scoreAts } from "@/features/ats/services/ats-scorer";
import { optimizeBullets } from "@/features/bullets/services/bullet-optimizer";
import { matchJobDescription } from "@/features/matching/services/job-matcher";
import {
  extractTextFromFile,
  parseResumeText,
} from "@/features/parser/services/parse-resume";
import { reviewResume } from "@/features/review/services/resume-reviewer";
import { AppError } from "@/lib/api";
import { db } from "@/lib/db";
import {
  isAcceptedMimeType,
  MAX_UPLOAD_BYTES,
  saveUpload,
} from "@/lib/storage";
import type { ParsedResume } from "@/types/resume";

function categorizeSkill(name: string): SkillCategory {
  const soft = [
    "leadership",
    "communication",
    "teamwork",
    "collaboration",
    "mentoring",
  ];
  if (soft.some((s) => name.toLowerCase().includes(s))) {
    return SkillCategory.SOFT;
  }
  return SkillCategory.TECHNICAL;
}

export async function createResumeFromUpload(file: File) {
  if (!isAcceptedMimeType(file.type)) {
    throw new AppError(
      "Only PDF and DOCX files are supported.",
      400,
      "INVALID_FILE_TYPE",
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("File must be 5MB or smaller.", 400, "FILE_TOO_LARGE");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" ? "pdf" : "docx";
  const storedName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath = await saveUpload(storedName, bytes);

  const resume = await db.resume.create({
    data: {
      fileName: storedName,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storagePath,
      status: "UPLOADED",
    },
  });

  return resume;
}

export async function parseAndAnalyzeResume(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new AppError("Resume not found", 404, "NOT_FOUND");

  await db.resume.update({
    where: { id: resumeId },
    data: { status: "PARSING" },
  });

  try {
    const fs = await import("fs/promises");
    const buffer = await fs.readFile(resume.storagePath);
    const rawText = await extractTextFromFile(buffer, resume.mimeType);
    const parsed = await parseResumeText(rawText);
    const ats = scoreAts(rawText, parsed);

    await db.skill.deleteMany({ where: { resumeId } });
    if (parsed.skills.length > 0) {
      await db.skill.createMany({
        data: parsed.skills.map((name) => ({
          resumeId,
          name,
          category: categorizeSkill(name),
          source: "parsed",
        })),
      });
    }

    const analysis = await db.resumeAnalysis.create({
      data: {
        resumeId,
        type: "ATS",
        overallScore: ats.overallScore,
        sectionScores: ats.sectionScores as Prisma.InputJsonValue,
        suggestions: ats.suggestions as Prisma.InputJsonValue,
        atsIssues: ats.issues as Prisma.InputJsonValue,
      },
    });

    const updated = await db.resume.update({
      where: { id: resumeId },
      data: {
        rawText,
        parsedData: parsed as Prisma.InputJsonValue,
        status: "ANALYZED",
      },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 5 },
        skills: true,
      },
    });

    return { resume: updated, analysis, parsed, ats };
  } catch (error) {
    await db.resume.update({
      where: { id: resumeId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

export async function runFullReview(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume?.rawText || !resume.parsedData) {
    throw new AppError("Resume must be parsed first", 400, "NOT_PARSED");
  }

  const parsed = resume.parsedData as ParsedResume;
  const review = await reviewResume(resume.rawText, parsed);

  return db.resumeAnalysis.create({
    data: {
      resumeId,
      type: "REVIEW",
      strengths: review.strengths as Prisma.InputJsonValue,
      weaknesses: review.weaknesses as Prisma.InputJsonValue,
      suggestions: review.suggestions as Prisma.InputJsonValue,
      grammarIssues: review.grammarIssues as Prisma.InputJsonValue,
      atsIssues: review.atsIssues as Prisma.InputJsonValue,
      missingInfo: review.missingInformation as Prisma.InputJsonValue,
      writingQuality: review.writingQuality as Prisma.InputJsonValue,
    },
  });
}

export async function runJobMatch(
  resumeId: string,
  jobText: string,
  title?: string,
) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume?.parsedData) {
    throw new AppError("Resume must be parsed first", 400, "NOT_PARSED");
  }

  const parsed = resume.parsedData as ParsedResume;
  const match = matchJobDescription(parsed, jobText);

  const analysis = await db.resumeAnalysis.create({
    data: {
      resumeId,
      type: "JOB_MATCH",
      matchPercentage: match.matchPercentage,
      matchingSkills: match.matchingSkills as Prisma.InputJsonValue,
      missingSkills: match.missingSkills as Prisma.InputJsonValue,
      missingKeywords: match.missingKeywords as Prisma.InputJsonValue,
      suggestions: match.suggestedImprovements as Prisma.InputJsonValue,
    },
  });

  await db.jobDescription.create({
    data: {
      resumeId,
      analysisId: analysis.id,
      title: title || "Untitled role",
      rawText: jobText,
      extractedSkills: match.matchingSkills as Prisma.InputJsonValue,
      extractedKeywords: match.missingKeywords as Prisma.InputJsonValue,
    },
  });

  return { analysis, match };
}

export async function runBulletOptimize(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume?.parsedData) {
    throw new AppError("Resume must be parsed first", 400, "NOT_PARSED");
  }

  const parsed = resume.parsedData as ParsedResume;
  const result = await optimizeBullets(parsed);

  const analysis = await db.resumeAnalysis.create({
    data: {
      resumeId,
      type: "BULLET_OPTIMIZE",
      rawResponse: result as Prisma.InputJsonValue,
      suggestions: result.bullets.map(
        (b) => b.rewritten,
      ) as Prisma.InputJsonValue,
    },
  });

  return { analysis, result };
}
