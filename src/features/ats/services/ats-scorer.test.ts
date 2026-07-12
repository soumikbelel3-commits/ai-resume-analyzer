import { describe, expect, it } from "vitest";

import { scoreAts } from "@/features/ats/services/ats-scorer";
import type { ParsedResume } from "@/types/resume";

const sample: ParsedResume = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
  summary: "Software engineer focused on reliable systems.",
  education: [{ institution: "University", degree: "BSc" }],
  experience: [
    {
      company: "Analytical Engines",
      title: "Engineer",
      bullets: [
        "Built distributed services that reduced latency by 40%.",
        "Led migration of legacy workloads to cloud infrastructure.",
      ],
    },
  ],
  projects: [],
  skills: ["TypeScript", "React", "Node", "PostgreSQL", "Docker", "AWS"],
  certifications: [],
  links: [{ label: "GitHub", url: "https://github.com/ada" }],
};

describe("scoreAts", () => {
  it("returns an overall score between 0 and 100", () => {
    const result = scoreAts(
      "Ada Lovelace ada@example.com TypeScript React Node AWS",
      sample,
    );
    expect(result.overallScore).toBeGreaterThan(50);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.sectionScores.contactInformation).toBeGreaterThan(70);
  });
});
