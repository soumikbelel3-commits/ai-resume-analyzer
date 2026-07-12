import type { ParsedResume } from "@/types/resume";
import { parsedResumeSchema } from "@/types/resume";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
const URL_RE = /https?:\/\/[^\s)]+/gi;

const SECTION_HEADERS: Record<string, string[]> = {
  experience: [
    "experience",
    "work experience",
    "employment",
    "professional experience",
  ],
  education: ["education", "academic background"],
  skills: ["skills", "technical skills", "core competencies", "technologies"],
  projects: ["projects", "personal projects", "selected projects"],
  certifications: ["certifications", "certificates", "licenses"],
  summary: ["summary", "profile", "objective", "about"],
};

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function detectSection(line: string): string | null {
  const cleaned = line
    .toLowerCase()
    .replace(/[:\-–—]/g, "")
    .trim();
  for (const [section, aliases] of Object.entries(SECTION_HEADERS)) {
    if (aliases.includes(cleaned)) return section;
  }
  return null;
}

function extractSkillsFromBlock(lines: string[]): string[] {
  const joined = lines.join(" ");
  return joined
    .split(/[,|•·]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40);
}

function parseExperience(lines: string[]) {
  const items: ParsedResume["experience"] = [];
  let current: ParsedResume["experience"][number] | null = null;

  for (const line of lines) {
    if (/^[•\-\*–]/.test(line) || line.startsWith("•")) {
      const bullet = line.replace(/^[•\-\*–]\s*/, "").trim();
      if (current && bullet) current.bullets.push(bullet);
      continue;
    }

    const roleMatch = line.match(/^(.+?)\s+[–\-|@]\s+(.+)$/);
    if (roleMatch) {
      if (current) items.push(current);
      current = {
        title: roleMatch[1].trim(),
        company: roleMatch[2].trim(),
        bullets: [],
      };
      continue;
    }

    if (!current) {
      current = { title: line, company: "Unknown", bullets: [] };
    } else if (!current.company || current.company === "Unknown") {
      current.company = line;
    } else {
      current.bullets.push(line);
    }
  }

  if (current) items.push(current);
  return items;
}

function parseEducation(lines: string[]) {
  return lines.map((line) => {
    const parts = line.split(/[–\-|]/).map((p) => p.trim());
    return {
      institution: parts[0] ?? line,
      degree: parts[1],
      field: parts[2],
    };
  });
}

function parseProjects(lines: string[]) {
  const projects: ParsedResume["projects"] = [];
  let current: ParsedResume["projects"][number] | null = null;

  for (const line of lines) {
    if (/^[•\-\*–]/.test(line)) {
      const bullet = line.replace(/^[•\-\*–]\s*/, "").trim();
      if (current && bullet) current.bullets.push(bullet);
      continue;
    }
    if (current) projects.push(current);
    current = { name: line, bullets: [], technologies: [] };
  }
  if (current) projects.push(current);
  return projects;
}

/**
 * Deterministic heuristic parser used when Gemini is unavailable,
 * and as a fallback if AI structured extraction fails.
 */
export function parseResumeHeuristically(rawText: string): ParsedResume {
  const lines = normalizeLines(rawText);
  const sections: Record<string, string[]> = {};
  let current = "header";
  sections[current] = [];

  for (const line of lines) {
    const section = detectSection(line);
    if (section) {
      current = section;
      sections[current] = sections[current] ?? [];
      continue;
    }
    sections[current] = sections[current] ?? [];
    sections[current].push(line);
  }

  const header = sections.header ?? [];
  const fullText = rawText;

  const email = fullText.match(EMAIL_RE)?.[0];
  const phone = fullText.match(PHONE_RE)?.[0];
  const urls = fullText.match(URL_RE) ?? [];

  const nameCandidate = header.find(
    (line) =>
      line.length > 2 &&
      line.length < 60 &&
      !EMAIL_RE.test(line) &&
      !PHONE_RE.test(line) &&
      !URL_RE.test(line),
  );

  const draft: ParsedResume = {
    name: nameCandidate,
    email,
    phone,
    summary: (sections.summary ?? []).join(" "),
    education: parseEducation(sections.education ?? []),
    experience: parseExperience(sections.experience ?? []),
    projects: parseProjects(sections.projects ?? []),
    skills: extractSkillsFromBlock(sections.skills ?? []),
    certifications: (sections.certifications ?? []).map((name) => ({ name })),
    links: urls.map((url) => ({
      label: url.includes("linkedin")
        ? "LinkedIn"
        : url.includes("github")
          ? "GitHub"
          : "Website",
      url,
    })),
  };

  return parsedResumeSchema.parse(draft);
}
