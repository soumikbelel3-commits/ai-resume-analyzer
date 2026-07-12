import { isAiConfigured, generateStructured } from "@/lib/ai";
import { scoreAts } from "@/features/ats/services/ats-scorer";
import {
  reviewResultSchema,
  type ParsedResume,
  type ReviewResult,
} from "@/types/resume";

function reviewHeuristically(
  rawText: string,
  parsed: ParsedResume,
): ReviewResult {
  const ats = scoreAts(rawText, parsed);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingInformation: string[] = [];

  if (parsed.experience.length > 0) {
    strengths.push("Work experience section is present.");
  } else {
    weaknesses.push("No clear work experience detected.");
  }

  if (parsed.skills.length >= 6) {
    strengths.push("Solid skills inventory.");
  } else {
    weaknesses.push("Skills list looks incomplete for ATS matching.");
  }

  if (parsed.summary) strengths.push("Professional summary is present.");
  else missingInformation.push("Add a concise professional summary.");

  if (!parsed.email) missingInformation.push("Email address");
  if (!parsed.phone) missingInformation.push("Phone number");
  if (parsed.education.length === 0) missingInformation.push("Education");

  const grammarIssues: string[] = [];
  const bullets = parsed.experience.flatMap((e) => e.bullets);
  for (const bullet of bullets) {
    if (bullet.length > 220) {
      grammarIssues.push(`Overly long bullet: "${bullet.slice(0, 60)}..."`);
    }
    if (/^\s*[a-z]/.test(bullet)) {
      grammarIssues.push(
        `Bullet should start with a capital letter: "${bullet.slice(0, 40)}..."`,
      );
    }
  }

  return {
    strengths,
    weaknesses: [...weaknesses, ...ats.issues],
    missingInformation,
    atsIssues: ats.issues,
    grammarIssues,
    writingQuality: {
      score: Math.round(
        (ats.sectionScores.readability + ats.sectionScores.actionVerbs) / 2,
      ),
      summary:
        ats.overallScore >= 75
          ? "Writing is generally clear and structured."
          : "Writing can be tightened with stronger verbs and metrics.",
    },
    suggestions: ats.suggestions,
  };
}

export async function reviewResume(
  rawText: string,
  parsed: ParsedResume,
): Promise<ReviewResult> {
  if (isAiConfigured()) {
    try {
      return await generateStructured({
        schema: reviewResultSchema,
        system:
          "You are an expert resume reviewer and ATS specialist. Be specific and actionable.",
        prompt: `Review this resume.\n\nParsed JSON:\n${JSON.stringify(parsed).slice(0, 12000)}\n\nRaw text:\n${rawText.slice(0, 12000)}`,
      });
    } catch (error) {
      console.warn("AI review failed, using heuristic review", error);
    }
  }

  return reviewHeuristically(rawText, parsed);
}
