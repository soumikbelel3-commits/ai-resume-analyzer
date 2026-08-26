/**
 * PDF text extraction that preserves line structure.
 *
 * pdfjs returns a flat list of positioned text runs with no line information.
 * Joining them naively collapses the whole page into one line, which defeats
 * every line-based consumer downstream (see `heuristic-parser.ts`). Lines are
 * reconstructed from each run's baseline Y coordinate, and two-column layouts
 * are split before grouping so a left-column heading is never welded to a
 * right-column one.
 *
 * Deliberately free of `server-only` so it can be unit-tested directly.
 */

type PositionedRun = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Two runs belong to the same line when their baselines are this close. */
function sameLineTolerance(height: number): number {
  return Math.max(1, height * 0.5);
}

/**
 * Whether a space is needed between two runs on the same line. Runs are often
 * split mid-word ("Tab" + "leau"), so a gap is required before separating them.
 */
function needsSpace(previous: PositionedRun, next: PositionedRun): boolean {
  if (/\s$/.test(previous.str) || /^\s/.test(next.str)) return false;
  const gap = next.x - (previous.x + previous.width);
  return gap > Math.max(0.5, previous.height * 0.2);
}

/** Groups runs into visual lines, ordered top-to-bottom, each ordered left-to-right. */
function groupIntoLines(runs: PositionedRun[]): PositionedRun[][] {
  // PDF user space has Y increasing upward, so descending Y is top-to-bottom.
  const sorted = [...runs].sort((a, b) => b.y - a.y);

  const lines: PositionedRun[][] = [];
  let current: PositionedRun[] = [];
  let baseline: number | null = null;

  for (const run of sorted) {
    if (
      baseline === null ||
      Math.abs(run.y - baseline) <= sameLineTolerance(run.height)
    ) {
      current.push(run);
      baseline ??= run.y;
      continue;
    }
    lines.push(current);
    current = [run];
    baseline = run.y;
  }
  if (current.length > 0) lines.push(current);

  return lines.map((line) => [...line].sort((a, b) => a.x - b.x));
}

function joinLine(runs: PositionedRun[]): string {
  let line = "";
  for (let i = 0; i < runs.length; i += 1) {
    const previous = runs[i - 1];
    if (previous && needsSpace(previous, runs[i])) line += " ";
    line += runs[i].str;
  }
  return line.trimEnd();
}

function runsToLines(runs: PositionedRun[]): string {
  return groupIntoLines(runs).map(joinLine).join("\n");
}

const BUCKETS = 200;

/**
 * Finds the X coordinate of a column gutter, or null for a single column.
 *
 * A gutter is measured by how many *lines* place a run over each horizontal
 * position. Requiring a completely empty band does not work: a single
 * full-width element (a summary paragraph above the columns) bridges the
 * gutter and hides it. Counting lines instead lets that one element be
 * outvoted by the dozen lines that respect the column boundary.
 */
function findColumnSplit(runs: PositionedRun[]): number | null {
  if (runs.length < 8) return null;

  const minX = Math.min(...runs.map((r) => r.x));
  const maxX = Math.max(...runs.map((r) => r.x + r.width));
  const contentWidth = maxX - minX;
  if (contentWidth <= 0) return null;

  const toBucket = (x: number) =>
    Math.min(
      BUCKETS - 1,
      Math.max(0, Math.round(((x - minX) / contentWidth) * (BUCKETS - 1))),
    );

  const lines = groupIntoLines(runs);
  if (lines.length < 6) return null;

  const coverage = new Array<number>(BUCKETS).fill(0);
  for (const line of lines) {
    const covered = new Set<number>();
    for (const run of line) {
      for (let i = toBucket(run.x); i <= toBucket(run.x + run.width); i += 1) {
        covered.add(i);
      }
    }
    for (const i of covered) coverage[i] += 1;
  }

  // A gutter is crossed by few lines; columns are crossed by many.
  const quiet = Math.max(1, Math.floor(lines.length * 0.2));
  let best: { start: number; end: number } | null = null;
  let start: number | null = null;
  for (let i = 0; i < BUCKETS; i += 1) {
    if (coverage[i] <= quiet) {
      start ??= i;
      continue;
    }
    if (start !== null) {
      const band = { start, end: i - 1 };
      if (
        band.start > 0 &&
        (!best || band.end - band.start > best.end - best.start)
      ) {
        best = band;
      }
      start = null;
    }
  }

  if (!best) return null;
  if ((best.end - best.start + 1) / BUCKETS < 0.04) return null;

  const splitX =
    minX + ((best.start + best.end) / 2 / (BUCKETS - 1)) * contentWidth;

  // Require real content on both sides, so a ragged right margin is not a gutter.
  const left = runs.filter((r) => r.x + r.width / 2 < splitX).length;
  const right = runs.length - left;
  const minimum = runs.length * 0.15;
  if (left < minimum || right < minimum) return null;

  return splitX;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import keeps pdfjs out of edge bundles and avoids SSR canvas issues.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const runs: PositionedRun[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      if (item.str.length === 0) continue;
      runs.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
      });
    }

    const splitX = findColumnSplit(runs);
    if (splitX === null) {
      pages.push(runsToLines(runs));
      continue;
    }

    const left = runs.filter((r) => r.x + r.width / 2 < splitX);
    const right = runs.filter((r) => r.x + r.width / 2 >= splitX);
    pages.push(
      [runsToLines(left), runsToLines(right)].filter(Boolean).join("\n"),
    );
  }

  return pages.join("\n");
}
