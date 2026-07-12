import { isAiConfigured, generateStructured } from "@/lib/ai";
import {
  bulletOptimizeResultSchema,
  type BulletOptimizeResult,
  type ParsedResume,
} from "@/types/resume";

const WEAK_STARTERS = [
  "responsible for",
  "helped",
  "worked on",
  "assisted with",
];

function rewriteBullet(bullet: string): {
  rewritten: string;
  improvements: string[];
} {
  const improvements: string[] = [];
  let rewritten = bullet.trim().replace(/^[•\-\*]\s*/, "");

  const lower = rewritten.toLowerCase();
  for (const weak of WEAK_STARTERS) {
    if (lower.startsWith(weak)) {
      rewritten = rewritten.replace(new RegExp(`^${weak}`, "i"), "Delivered");
      improvements.push("Replaced weak starter with a stronger action verb");
      break;
    }
  }

  if (!/^[A-Z]/.test(rewritten)) {
    rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
    improvements.push("Capitalized starting word");
  }

  if (!/\d/.test(rewritten)) {
    rewritten = `${rewritten.replace(/\.$/, "")}, improving outcomes by a measurable margin`;
    improvements.push(
      "Added placeholder for metrics — replace with real numbers",
    );
  }

  if (!/[.!?]$/.test(rewritten)) {
    rewritten = `${rewritten}.`;
  }

  if (improvements.length === 0) {
    improvements.push("Clarified phrasing for impact and scanability");
  }

  return { rewritten, improvements };
}

function optimizeHeuristically(parsed: ParsedResume): BulletOptimizeResult {
  const bullets = parsed.experience.flatMap((exp) =>
    exp.bullets.map((original) => {
      const { rewritten, improvements } = rewriteBullet(original);
      return { original, rewritten, improvements };
    }),
  );

  return { bullets: bullets.slice(0, 12) };
}

export async function optimizeBullets(
  parsed: ParsedResume,
): Promise<BulletOptimizeResult> {
  const sourceBullets = parsed.experience
    .flatMap((e) => e.bullets)
    .slice(0, 12);

  if (sourceBullets.length === 0) {
    return { bullets: [] };
  }

  if (isAiConfigured()) {
    try {
      return await generateStructured({
        schema: bulletOptimizeResultSchema,
        system:
          "You rewrite resume bullets to maximize impact, metrics, action verbs, and clarity. Keep truthfulness — do not invent employers.",
        prompt: `Rewrite these resume bullets. Return original, rewritten, and improvements for each.\n\n${JSON.stringify(sourceBullets)}`,
      });
    } catch (error) {
      console.warn("AI bullet optimize failed, using heuristic", error);
    }
  }

  return optimizeHeuristically(parsed);
}
