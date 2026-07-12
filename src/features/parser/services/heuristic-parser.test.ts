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
