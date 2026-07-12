import type { AtsResult, ParsedResume, SectionScores } from "@/types/resume";

const ACTION_VERBS = [
  "led",
  "built",
  "designed",
  "implemented",
  "developed",
  "created",
  "improved",
  "optimized",
  "reduced",
  "increased",
  "managed",
  "launched",
  "delivered",
  "architected",
  "automated",
  "collaborated",
  "analyzed",
  "migrated",
  "scaled",
  "owned",
];

const COMMON_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "node",
  "python",
  "java",
  "aws",
  "docker",
  "kubernetes",
  "sql",
  "api",
  "agile",
  "ci/cd",
  "next.js",
  "postgresql",
];

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function collectBullets(parsed: ParsedResume) {
  return [
    ...parsed.experience.flatMap((e) => e.bullets),
    ...parsed.projects.flatMap((p) => p.bullets),
  ];
}

export function scoreAts(
  rawText: string,
  parsed: ParsedResume,
  targetKeywords: string[] = COMMON_KEYWORDS,
): AtsResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const bullets = collectBullets(parsed);
  const lower = rawText.toLowerCase();

  // Contact
  let contactInformation = 40;
  if (parsed.email) contactInformation += 30;
  else issues.push("Missing email address.");
  if (parsed.phone) contactInformation += 20;
  else suggestions.push("Add a phone number for recruiter outreach.");
  if (parsed.links.length > 0) contactInformation += 10;

  // Experience
  let experience = 20;
  if (parsed.experience.length > 0) experience += 40;
  else issues.push("No work experience section detected.");
  if (bullets.length >= 4) experience += 25;
  else suggestions.push("Add more achievement-focused bullet points.");
  if (bullets.some((b) => /\d/.test(b))) experience += 15;
  else suggestions.push("Quantify impact with metrics (%, $, time).");

  // Skills
  let skills = 20;
  if (parsed.skills.length >= 5) skills += 50;
  else if (parsed.skills.length > 0) skills += 30;
  else issues.push("Skills section is missing or too thin.");
  if (parsed.skills.length >= 10) skills += 20;

  // Education
  const education = parsed.education.length > 0 ? 85 : 35;
  if (parsed.education.length === 0) {
    suggestions.push("Include education details if relevant to the role.");
  }

  // Action verbs
  const verbHits = bullets.filter((b) =>
    ACTION_VERBS.some((v) => b.toLowerCase().startsWith(v)),
  ).length;
  const actionVerbs =
    bullets.length === 0
      ? 20
      : clamp((verbHits / Math.max(bullets.length, 1)) * 100 + 20);
  if (actionVerbs < 60) {
    suggestions.push("Start bullets with strong action verbs.");
  }

  // Keywords
  const keywordHits = targetKeywords.filter((k) =>
    lower.includes(k.toLowerCase()),
  );
  const keywords = clamp((keywordHits.length / targetKeywords.length) * 100);
  if (keywords < 50) {
    suggestions.push("Align resume keywords with target role technologies.");
  }

  // Section completeness
  const present = [
    Boolean(parsed.name),
    Boolean(parsed.email),
    parsed.experience.length > 0,
    parsed.education.length > 0,
    parsed.skills.length > 0,
    Boolean(parsed.summary),
  ].filter(Boolean).length;
  const sectionCompleteness = clamp((present / 6) * 100);

  // Formatting / readability heuristics
  const lineCount = rawText.split(/\n/).filter(Boolean).length;
  const avgLine = rawText.length / Math.max(lineCount, 1);
  let formatting = 70;
  if (rawText.length < 400) {
    formatting -= 30;
    issues.push("Resume text appears too short — parsing may have failed.");
  }
  if (avgLine > 180) {
    formatting -= 15;
    suggestions.push("Break dense paragraphs into bullet points.");
  }

  let readability = 65;
  const longBullets = bullets.filter((b) => b.split(" ").length > 28).length;
  if (longBullets > 0) {
    readability -= Math.min(25, longBullets * 5);
    suggestions.push("Shorten overly long bullet points for ATS readability.");
  }
  if (bullets.length >= 6) readability += 15;

  const sectionScores: SectionScores = {
    formatting: clamp(formatting),
    readability: clamp(readability),
    contactInformation: clamp(contactInformation),
    experience: clamp(experience),
    skills: clamp(skills),
    education: clamp(education),
    actionVerbs: clamp(actionVerbs),
    keywords: clamp(keywords),
    sectionCompleteness: clamp(sectionCompleteness),
  };

  const values = Object.values(sectionScores);
  const overallScore = clamp(
    values.reduce((sum, n) => sum + n, 0) / values.length,
  );

  return {
    overallScore,
    sectionScores,
    issues,
    suggestions,
  };
}
