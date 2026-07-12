import { PrismaClient } from "@prisma/client";
import { scoreAts } from "../src/features/ats/services/ats-scorer";
import { parseResumeHeuristically } from "../src/features/parser/services/heuristic-parser";

async function main() {
  const db = new PrismaClient();
  const text = `Alex Candidate
alex@example.com
+1 555 010 2000

Summary
Full-stack engineer building reliable product systems.

Skills
TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, AWS

Experience
Software Engineer - Example Corp
- Built APIs that improved throughput by 25%
- Led migration of services to containerized infrastructure

Education
Example University - BSc Computer Science
`;

  const parsed = parseResumeHeuristically(text);
  const ats = scoreAts(text, parsed);

  const resume = await db.resume.create({
    data: {
      fileName: "smoke.txt",
      originalName: "smoke-resume.txt",
      mimeType: "text/plain",
      fileSize: text.length,
      storagePath: "fixtures/smoke.txt",
      rawText: text,
      parsedData: parsed,
      status: "ANALYZED",
    },
  });

  await db.skill.createMany({
    data: parsed.skills.map((name) => ({
      resumeId: resume.id,
      name,
      category: "TECHNICAL",
      source: "parsed",
    })),
  });

  await db.resumeAnalysis.create({
    data: {
      resumeId: resume.id,
      type: "ATS",
      overallScore: ats.overallScore,
      sectionScores: ats.sectionScores,
      suggestions: ats.suggestions,
      atsIssues: ats.issues,
    },
  });

  console.log(
    JSON.stringify(
      {
        id: resume.id,
        score: ats.overallScore,
        skills: parsed.skills,
      },
      null,
      2,
    ),
  );

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
