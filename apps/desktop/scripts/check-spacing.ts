import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

import { toSpacingFindings, toSpacingScale } from "./spacing/scan.ts";
import type { SpacingFinding, SpacingKind } from "./spacing/scan.ts";
import { fail, runCli } from "./stamp/args.js";
import { WORKSPACE_ROOT } from "./workspace-root.ts";

type GatedKind = Exclude<SpacingKind, "uneven">;

type SpacingCounts = Record<SpacingKind, number>;

interface SpacingBaseline {
  readonly counts: Readonly<Record<GatedKind, number>>;
}

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));

const BASELINE = fileURLToPath(
  new URL("spacing-baseline.json", import.meta.url)
);

const OUT = path.join(APP_ROOT, "artifacts", "spacing-check");

const TOKENS = path.join(APP_ROOT, "src", "ui", "styles", "tokens.css");

const ROOTS = [
  path.join(APP_ROOT, "src", "ui"),
  path.join(WORKSPACE_ROOT, "packages", "ui", "src"),
];

const GATED: readonly GatedKind[] = ["tokenable", "off-scale"];

const KINDS: readonly SpacingKind[] = ["tokenable", "off-scale", "uneven"];

const ENCODING = "utf-8";

const FIX =
  "use a var(--s-*) token from src/ui/styles/tokens.css, then run pnpm exec tsx scripts/check-spacing.ts --write-baseline";

const toCssFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });

  return entries
    .flatMap((entry) => {
      if (!entry.isFile() || !entry.name.endsWith(".css")) {
        return [];
      }

      return [path.join(entry.parentPath, entry.name)];
    })
    .toSorted();
};

const toFileFindings = async (
  file: string,
  tokensCss: string
): Promise<SpacingFinding[]> => {
  const css = await readFile(file, ENCODING);

  return toSpacingFindings(
    path.relative(WORKSPACE_ROOT, file),
    css,
    toSpacingScale(tokensCss)
  );
};

const toFindings = async (): Promise<SpacingFinding[]> => {
  const [tokensCss, fileLists] = await Promise.all([
    readFile(TOKENS, ENCODING),
    Promise.all(ROOTS.map((root) => toCssFiles(root))),
  ]);

  const perFile = await Promise.all(
    fileLists.flat().map((file) => toFileFindings(file, tokensCss))
  );

  return perFile.flat();
};

const toCounts = (findings: readonly SpacingFinding[]): SpacingCounts => {
  const counts: SpacingCounts = { "off-scale": 0, tokenable: 0, uneven: 0 };

  for (const finding of findings) {
    counts[finding.kind] += 1;
  }

  return counts;
};

const toFindingLine = (finding: SpacingFinding): string =>
  `- \`${finding.file}:${finding.line}\` \`${finding.selector}\`: ${finding.detail}`;

const toKindLines = (
  findings: readonly SpacingFinding[],
  kind: SpacingKind
): string[] => {
  const lines = findings.flatMap((finding) => {
    if (finding.kind !== kind) {
      return [];
    }

    return [toFindingLine(finding)];
  });

  return [`## ${kind} (${lines.length})`, "", ...lines, ""];
};

const exportReport = async (
  findings: readonly SpacingFinding[]
): Promise<string> => {
  const file = path.join(OUT, "report.md");

  const lines = [
    "# Spacing check",
    "",
    "tokenable: a raw px value that equals a --s-* token. off-scale: a raw px value with no token. uneven: padding whose left and right differ by 4 px or more (report only).",
    "",
    ...KINDS.flatMap((kind) => toKindLines(findings, kind)),
  ];

  await mkdir(OUT, { recursive: true });
  await writeFile(file, lines.join("\n"));

  return file;
};

const getBaseline = async (): Promise<SpacingBaseline | null> => {
  try {
    const text = await readFile(BASELINE, ENCODING);

    return JSON.parse(text) as SpacingBaseline;
  } catch {
    return null;
  }
};

const exportBaseline = async (counts: SpacingCounts): Promise<void> => {
  const baseline: SpacingBaseline = {
    counts: { "off-scale": counts["off-scale"], tokenable: counts.tokenable },
  };

  await writeFile(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
};

const toRises = (counts: SpacingCounts, baseline: SpacingBaseline): string[] =>
  GATED.flatMap((kind) => {
    if (counts[kind] <= baseline.counts[kind]) {
      return [];
    }

    return [`${kind}: ${baseline.counts[kind]} -> ${counts[kind]}`];
  });

const runGate = async (
  counts: SpacingCounts,
  isWrite: boolean
): Promise<void> => {
  const baseline = await getBaseline();

  if (baseline === null && !isWrite) {
    fail("scripts/spacing-baseline.json is missing", FIX);
  }

  const rises = toRises(counts, baseline ?? { counts });

  if (rises.length > 0) {
    fail(`spacing findings rose above the baseline: ${rises.join(", ")}`, FIX);
  }

  if (isWrite) {
    await exportBaseline(counts);
  }
};

const runCheck = async (): Promise<void> => {
  const findings = await toFindings();
  const counts = toCounts(findings);
  const report = await exportReport(findings);

  console.log(`report: ${report}`);
  console.log(JSON.stringify(counts));
  await runGate(counts, argv.includes("--write-baseline"));
  console.log("check-spacing: pass");
};

await runCli(runCheck);
