import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { extractPdfText } from "@/features/parser/services/pdf-text";
import { parseResumeHeuristically } from "@/features/parser/services/heuristic-parser";

/**
 * `sample-resume.pdf` is a synthetic single-column resume generated with jsPDF.
 * A real resume is deliberately NOT used: this repository is public, and a real
 * one carries a name, email and phone number.
 */
const fixture = () =>
  readFileSync(path.join(__dirname, "__fixtures__", "sample-resume.pdf"));

describe("extractPdfText", () => {
  it("preserves the line structure of the document", async () => {
    const text = await extractPdfText(fixture());

    // The defect this guards: every text item was joined with a space, so a
    // one-page resume came back as a single line and no section could match.
    expect(text).toContain("\n");

    const lines = text.split("\n").map((l) => l.trim());
    expect(lines).toContain("Skills");
    expect(lines).toContain("Experience");
    expect(lines).toContain("Education");
  });

  it("produces text the heuristic parser can actually parse", async () => {
    const parsed = parseResumeHeuristically(await extractPdfText(fixture()));

    expect(parsed.name).toBe("Ada Lovelace");
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.skills).toEqual(
      expect.arrayContaining(["Python", "SQL", "Tableau"]),
    );
    expect(parsed.experience.length).toBeGreaterThan(0);
    expect(parsed.education.length).toBeGreaterThan(0);
  });
});

describe("extractPdfText with a two-column layout", () => {
  const twoColumn = () =>
    readFileSync(path.join(__dirname, "__fixtures__", "two-column-resume.pdf"));

  it("does not weld the two columns onto shared lines", async () => {
    const text = await extractPdfText(twoColumn());
    const lines = text.split("\n").map((l) => l.trim());

    // The failure mode on a real two-column resume was lines like
    // "Experience Skills" — a left-column heading fused to a right-column one.
    expect(lines).toContain("Experience");
    expect(lines).toContain("Skills");
    expect(lines.some((l) => /Experience\s+Skills/.test(l))).toBe(false);
  });

  it("parses a two-column resume into real sections", async () => {
    const parsed = parseResumeHeuristically(await extractPdfText(twoColumn()));

    expect(parsed.skills).toEqual(
      expect.arrayContaining(["COBOL", "FORTRAN", "Assembly"]),
    );
    expect(parsed.experience.length).toBeGreaterThan(0);
    expect(parsed.education.length).toBeGreaterThan(0);
  });
});
