import type { JobMatchResult, ParsedResume } from "@/types/resume";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "with",
  "on",
  "at",
  "by",
  "from",
  "as",
  "is",
  "are",
  "be",
  "this",
  "that",
  "will",
  "you",
  "your",
  "we",
  "our",
  "their",
  "have",
  "has",
  "experience",
  "years",
  "work",
  "ability",
  "strong",
  "using",
  "including",
  "team",
  "role",
  "job",
  "position",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function matchJobDescription(
  parsed: ParsedResume,
  jobText: string,
): JobMatchResult {
  const resumeSkills = parsed.skills.map((s) => s.toLowerCase());
  const resumeBlob = [
    parsed.summary ?? "",
    ...parsed.skills,
    ...parsed.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...parsed.projects.flatMap((p) => [
      p.name,
      ...(p.technologies ?? []),
      ...p.bullets,
    ]),
  ]
    .join(" ")
    .toLowerCase();

  const jdTokens = unique(tokenize(jobText));
  const skillLike = jdTokens.filter(
    (t) =>
      t.length >= 3 &&
      (resumeSkills.includes(t) ||
        /js|ts|sql|api|cloud|aws|azure|react|node|java|python|docker|kubernetes|next/.test(
          t,
        )),
  );

  const matchingSkills = unique(
    [...resumeSkills, ...skillLike].filter(
      (skill) =>
        resumeBlob.includes(skill) && jobText.toLowerCase().includes(skill),
    ),
  );

  const missingSkills = unique(
    skillLike.filter((skill) => !resumeBlob.includes(skill)),
  );

  const importantKeywords = jdTokens.filter((t) => t.length > 4).slice(0, 40);

  const missingKeywords = importantKeywords.filter(
    (kw) => !resumeBlob.includes(kw),
  );

  const required = unique([...skillLike, ...importantKeywords.slice(0, 20)]);
  const matchedCount = required.filter((r) => resumeBlob.includes(r)).length;
  const matchPercentage =
    required.length === 0
      ? 0
      : Math.round((matchedCount / required.length) * 100);

  const suggestedImprovements = [
    ...missingSkills.slice(0, 5).map((s) => `Add or demonstrate skill: ${s}`),
    ...missingKeywords
      .slice(0, 5)
      .map((k) => `Consider weaving in keyword: ${k}`),
  ];

  if (suggestedImprovements.length === 0) {
    suggestedImprovements.push(
      "Resume already covers most detected job keywords — tailor bullets to mirror JD language.",
    );
  }

  return {
    matchPercentage,
    matchingSkills,
    missingSkills,
    missingKeywords: missingKeywords.slice(0, 15),
    suggestedImprovements,
  };
}
