import { describe, expect, it } from "vitest";

import { isParseEmpty } from "@/features/parser/services/parse-quality";
import { parsedResumeSchema, type ParsedResume } from "@/types/resume";

const parse = (overrides: Partial<ParsedResume> = {}): ParsedResume =>
  parsedResumeSchema.parse(overrides);

describe("isParseEmpty", () => {
  it("flags a parse with no skills, experience or education", () => {
    expect(isParseEmpty(parse())).toBe(true);
  });

  it("still flags it when only contact details were found", () => {
    // Email and phone come from regexes over the whole text, so they survive
    // even when no section was understood. They are not evidence of a parse.
    expect(
      isParseEmpty(
        parse({ name: "Ada", email: "ada@example.com", phone: "+1 555 0100" }),
      ),
    ).toBe(true);
  });

  it("does not flag a resume that has only skills", () => {
    expect(isParseEmpty(parse({ skills: ["Python"] }))).toBe(false);
  });

  it("does not flag a resume that has only experience", () => {
    expect(
      isParseEmpty(
        parse({
          experience: [{ company: "Acme", title: "Analyst", bullets: [] }],
        }),
      ),
    ).toBe(false);
  });

  it("does not flag a resume that has only education", () => {
    expect(
      isParseEmpty(parse({ education: [{ institution: "Cambridge" }] })),
    ).toBe(false);
  });
});
