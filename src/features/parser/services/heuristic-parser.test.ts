import { describe, expect, it } from "vitest";

import { parseResumeHeuristically } from "@/features/parser/services/heuristic-parser";

describe("parseResumeHeuristically", () => {
  it("extracts contact and skills sections", () => {
    const text = `
Jane Doe
jane@example.com
+1 555 123 4567

Summary
Experienced engineer.

Skills
TypeScript, React, Node.js, PostgreSQL

Experience
Software Engineer - Acme
- Built APIs that improved throughput by 25%

Education
MIT - BSc Computer Science
`.trim();

    const parsed = parseResumeHeuristically(text);
    expect(parsed.email).toBe("jane@example.com");
    expect(parsed.skills.length).toBeGreaterThan(0);
    expect(parsed.experience.length).toBeGreaterThan(0);
  });
});

describe("name detection", () => {
  it("joins a name split across lines by large display type", () => {
    // PDF display type often emits each word as its own run at a slightly
    // different baseline, so the surname lands on its own line.
    const parsed = parseResumeHeuristically(
      ["Ada", "Lovelace", "ada@example.com", "+1 555 0100"].join("\n"),
    );
    expect(parsed.name).toBe("Ada Lovelace");
  });

  it("leaves a name that is already on one line alone", () => {
    const parsed = parseResumeHeuristically(
      ["Grace Hopper", "grace@example.com"].join("\n"),
    );
    expect(parsed.name).toBe("Grace Hopper");
  });
});

describe("skill extraction", () => {
  const block = [
    "Skills",
    "Python ( Numpy, Pandas, Seaborn ,",
    "scikit_learn,sqlalchemy)",
    "SQL ( MS SQL , PostgreSQL, My SQL )",
    "Microsoft Excel (power query, pivot table)",
    "Tableau",
  ].join("\n");

  it("keeps parenthetical detail with its skill instead of splitting on every comma", () => {
    const { skills } = parseResumeHeuristically(block);

    // The head term and its parenthesised members are all real skills.
    expect(skills).toEqual(
      expect.arrayContaining([
        "Python",
        "Numpy",
        "Pandas",
        "SQL",
        "PostgreSQL",
        "Microsoft Excel",
        "Tableau",
      ]),
    );
  });

  it("never emits a fragment with unbalanced parentheses", () => {
    const { skills } = parseResumeHeuristically(block);

    for (const skill of skills) {
      const opens = (skill.match(/\(/g) ?? []).length;
      const closes = (skill.match(/\)/g) ?? []).length;
      expect({ skill, opens, closes }).toEqual({ skill, opens: 0, closes: 0 });
    }
  });

  it("still splits a plain comma-separated list", () => {
    const { skills } = parseResumeHeuristically(
      ["Skills", "TypeScript, React, PostgreSQL"].join("\n"),
    );
    expect(skills).toEqual(["TypeScript", "React", "PostgreSQL"]);
  });
});

describe("education parsing", () => {
  it("does not swallow a singular 'Certification' heading", () => {
    const parsed = parseResumeHeuristically(
      [
        "Education",
        "Bachelor of Science in Mathematics",
        "Trinity College,",
        "University of Cambridge",
        "Graduated: August 2022",
        "Certification",
        "Google Data Analytics ( Google )",
        "Python For Everybody ( University of Michigan )",
      ].join("\n"),
    );

    expect(parsed.education).toHaveLength(1);
    expect(parsed.certifications.length).toBeGreaterThan(0);
  });

  it("groups the lines of one degree into a single entry", () => {
    const parsed = parseResumeHeuristically(
      [
        "Education",
        "Bachelor of Science in Mathematics",
        "Trinity College,",
        "University of Cambridge",
        "Cambridge, UK",
        "Graduated: August 2022",
      ].join("\n"),
    );

    expect(parsed.education).toHaveLength(1);
    expect(parsed.education[0].institution).toMatch(/Cambridge|Trinity/);
  });

  it("separates two degrees into two entries", () => {
    const parsed = parseResumeHeuristically(
      [
        "Education",
        "Master of Science in Statistics",
        "University of Oxford",
        "Bachelor of Science in Mathematics",
        "University of Cambridge",
      ].join("\n"),
    );

    expect(parsed.education).toHaveLength(2);
  });

  it("falls back to one entry when no degree keyword is recognisable", () => {
    // Real resumes contain typos; five lines is one degree, not five degrees.
    const parsed = parseResumeHeuristically(
      [
        "Education",
        "Bachaeor 's in Science",
        "Serampore college,",
        "University of Calcutta",
        "kolkata, West Bengal",
        "Graduated: August 2022",
      ].join("\n"),
    );

    expect(parsed.education).toHaveLength(1);
  });
});
