import { describe, expect, it } from "vitest";

import { optimizeBullets } from "@/features/bullets/services/bullet-optimizer";
import { reviewResume } from "@/features/review/services/resume-reviewer";
import type { ParsedResume } from "@/types/resume";

const parsed: ParsedResume = {
  name: "Alex",
  email: "alex@example.com",
  phone: "555",
  summary: "Engineer",
  skills: ["TypeScript", "React"],
  education: [{ institution: "Uni" }],
  experience: [
    {
      company: "Acme",
      title: "Engineer",
      bullets: [
        "responsible for building APIs",
        "helped the team ship features",
      ],
    },
  ],
  projects: [],
  certifications: [],
  links: [],
};

describe("review and bullet services", () => {
  it("produces a heuristic review without AI", async () => {
    const review = await reviewResume(
      "Alex alex@example.com TypeScript React",
      parsed,
    );
    expect(review.strengths.length).toBeGreaterThan(0);
    expect(review.writingQuality.score).toBeGreaterThan(0);
  });

  it("rewrites weak bullets", async () => {
    const result = await optimizeBullets(parsed);
    expect(result.bullets.length).toBe(2);
    expect(result.bullets[0].rewritten.toLowerCase()).not.toContain(
      "responsible for",
    );
  });
});
