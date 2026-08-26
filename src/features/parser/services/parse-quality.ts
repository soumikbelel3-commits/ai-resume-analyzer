import type { ParsedResume } from "@/types/resume";

/**
 * Whether a parse produced no usable structure at all.
 *
 * Text extraction can succeed on a layout the parser cannot follow, and the
 * result then looks like success: a resume was stored, marked ANALYZED and
 * given an ATS score, while every section was empty. Callers use this to
 * refuse rather than to score.
 *
 * Contact details are deliberately ignored. Email and phone are matched by
 * regex across the whole raw text, so they survive even when nothing was
 * understood — their presence is not evidence that the parse worked.
 */
export function isParseEmpty(parsed: ParsedResume): boolean {
  return (
    parsed.skills.length === 0 &&
    parsed.experience.length === 0 &&
    parsed.education.length === 0
  );
}
