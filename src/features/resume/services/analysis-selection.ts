import type { Prisma } from "@prisma/client";

/**
 * Only ATS and FULL analyses populate `overallScore`. REVIEW, JOB_MATCH and
 * BULLET_OPTIMIZE leave it null, so selecting "the latest analysis" of any
 * type blanks a resume's score the moment the user runs a review or a job
 * match — the score is still there, just one row further down.
 *
 * Shared so the dashboard list and the analytics chart cannot drift apart.
 */
export const latestScoredAnalysis = {
  where: { type: { in: ["ATS", "FULL"] } },
  orderBy: { createdAt: "desc" },
  take: 1,
} satisfies Prisma.Resume$analysesArgs;
