import type { ParsedResume } from "@/types/resume";

const SOFT_SKILLS = new Set([
  "leadership",
  "communication",
  "teamwork",
  "collaboration",
  "problem solving",
  "problem-solving",
  "adaptability",
  "creativity",
  "time management",
  "critical thinking",
  "mentoring",
]);

const TRENDING = [
  "TypeScript",
  "Next.js",
  "React",
  "AI/ML",
  "Python",
  "AWS",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "System Design",
];

export type SkillsDashboardData = {
  technical: string[];
  soft: string[];
  missing: string[];
  trending: string[];
  coverage: number;
};

export function buildSkillsDashboard(
  parsed: ParsedResume,
  missingFromJd: string[] = [],
): SkillsDashboardData {
  const technical: string[] = [];
  const soft: string[] = [];

  for (const skill of parsed.skills) {
    if (SOFT_SKILLS.has(skill.toLowerCase())) soft.push(skill);
    else technical.push(skill);
  }

  const owned = new Set(parsed.skills.map((s) => s.toLowerCase()));
  const trendingMissing = TRENDING.filter((t) => !owned.has(t.toLowerCase()));
  const coverage = Math.round(
    ((TRENDING.length - trendingMissing.length) / TRENDING.length) * 100,
  );

  return {
    technical,
    soft,
    missing: missingFromJd,
    trending: TRENDING,
    coverage,
  };
}
