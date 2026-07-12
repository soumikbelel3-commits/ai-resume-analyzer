import { describe, expect, it } from "vitest";

import { matchJobDescription } from "@/features/matching/services/job-matcher";
import type { ParsedResume } from "@/types/resume";

const parsed: ParsedResume = {
  name: "Test",
  email: "t@example.com",
  skills: ["TypeScript", "React", "Node"],
  education: [],
  experience: [
    {
      company: "Acme",
      title: "Frontend Engineer",
      bullets: ["Built React dashboards with TypeScript"],
    },
  ],
  projects: [],
  certifications: [],
  links: [],
};

describe("matchJobDescription", () => {
  it("detects matching and missing skills", () => {
    const result = matchJobDescription(
      parsed,
      "We need a React TypeScript engineer with Kubernetes and Docker experience.",
    );
    expect(result.matchPercentage).toBeGreaterThan(0);
    expect(result.matchingSkills.join(" ").toLowerCase()).toContain("react");
    expect(result.missingSkills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["kubernetes"]),
    );
  });
});
