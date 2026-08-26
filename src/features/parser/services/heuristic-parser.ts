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
  certifications: [
    "certifications",
    "certification",
    "certificates",
    "certificate",
    "licenses",
    "licences",
  ],
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

const SKILL_SEPARATORS = new Set([",", "|", "•", "·"]);

/**
 * Splits on separators that sit outside parentheses. `Python (Numpy, Pandas)`
 * is one skill with detail, not three fragments — splitting on every comma
 * produced entries like `"Python ( Numpy"` and `"sqlalchemy) SQL ( MS SQL"`.
 *
 * A line break also separates, but only at depth zero: a skill whose
 * parenthetical wraps onto the next line is a single entry.
 */
function splitOutsideParens(text: string): string[] {
  const parts: string[] = [];
  let buffer = "";
  let depth = 0;

  for (const char of text) {
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);

    const isBreak = char === "\n";
    if (depth === 0 && (SKILL_SEPARATORS.has(char) || isBreak)) {
      parts.push(buffer);
      buffer = "";
      continue;
    }
    buffer += isBreak ? " " : char;
  }
  parts.push(buffer);

  return parts;
}

/** `Microsoft Excel (power query, pivot table)` -> the head term plus each member. */
function expandSkill(entry: string): string[] {
  const open = entry.indexOf("(");
  if (open === -1) return [entry];

  const close = entry.lastIndexOf(")");
  const head = entry.slice(0, open);
  const inner = entry.slice(open + 1, close === -1 ? undefined : close);

  return [head, ...splitOutsideParens(inner)];
}

function extractSkillsFromBlock(lines: string[]): string[] {
  const seen = new Map<string, string>();

  for (const entry of splitOutsideParens(lines.join("\n"))) {
    for (const skill of expandSkill(entry)) {
      const cleaned = skill.replace(/[()]/g, "").trim();
      if (cleaned.length <= 1 || cleaned.length >= 40) continue;
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) seen.set(key, cleaned);
    }
  }

  return [...seen.values()];
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

const DEGREE_RE =
  /\b(bachelor|master|doctorate|phd|b\.?sc|m\.?sc|b\.?tech|m\.?tech|b\.?a|m\.?a|mba|bca|mca|diploma|associate)\b/i;
const INSTITUTION_RE =
  /\b(university|college|school|institute|academy|polytechnic)\b/i;

/**
 * One degree usually spans several lines — degree, institution, location,
 * graduation date. Mapping one entry per line reported 15 degrees for a
 * single-degree resume. A new entry starts only at a recognisable degree
 * line; where none is recognisable the block becomes a single entry, which
 * degrades far more gracefully than one entry per line.
 */
function parseEducation(lines: string[]) {
  const groups: string[][] = [];
  for (const line of lines) {
    if (groups.length === 0 || DEGREE_RE.test(line)) groups.push([line]);
    else groups[groups.length - 1].push(line);
  }

  const tidy = (value: string) => value.replace(/[\s,]+$/, "").trim();

  return groups.map((group) => {
    const degree = group.find((line) => DEGREE_RE.test(line));
    const institution = group.find((line) => INSTITUTION_RE.test(line));

    // A lone "MIT - BSc Computer Science" still splits on its separator.
    if (!degree && !institution && group.length === 1) {
      const parts = group[0].split(/\s[–\-|]\s/).map((part) => part.trim());
      return { institution: parts[0], degree: parts[1], field: parts[2] };
    }

    return {
      institution: tidy(institution ?? group[0]),
      degree: degree ? tidy(degree) : undefined,
      field: undefined,
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

/** A header line that could plausibly be part of a person's name. */
function isNameLike(line: string): boolean {
  return (
    line.length > 1 &&
    line.length < 60 &&
    !/\d/.test(line) &&
    !EMAIL_RE.test(line) &&
    !PHONE_RE.test(line) &&
    !URL_RE.test(line)
  );
}

/**
 * Display type in a PDF header is often emitted one word per run at slightly
 * different baselines, so a name arrives split across lines ("Soumik" then
 * "Belel"). Consecutive single-word header lines are joined back together.
 */
function detectName(header: string[]): string | undefined {
  const start = header.findIndex(isNameLike);
  if (start === -1) return undefined;

  const first = header[start];
  if (/\s/.test(first)) return first;

  const parts = [first];
  for (let i = start + 1; i < header.length && parts.length < 3; i += 1) {
    if (!isNameLike(header[i]) || /\s/.test(header[i])) break;
    parts.push(header[i]);
  }
  return parts.join(" ");
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

  const nameCandidate = detectName(header);

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
