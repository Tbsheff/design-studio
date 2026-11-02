import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Diagnostic = { code: string; filename: string; severity: string };
type Counts = Record<string, number>;
type Baseline = { total: number; rules: Counts; dirs: Counts };

const BASELINE = new URL("lint-baseline.json", import.meta.url);

const BUDGET_ZERO = [
  "src/server/platform/",
  "src/server/events/",
  "src/server/run-log/",
  "src/server/project-source/",
  "src/server/page-probe/",
  "src/server/handlers/",
  "src/server/main/",
  "src/server/ship/",
  "src/server/agent-tools/",
  "src/shared/actions/",
  "src/ui/kit/",
  "src/ui/domain/",
  "src/ui/platform/",
  "src/ui/features/",
  "src/ui/app/",
];

const lint = (): Diagnostic[] => {
  const run = spawnSync(
    "node_modules/.bin/oxlint",
    ["-c", "oxlint.config.ts", "--format=json"],
    { encoding: "utf-8", maxBuffer: 2 ** 31 - 1 }
  );
  const parsed: { diagnostics?: Diagnostic[] } = JSON.parse(run.stdout || "{}");
  return parsed.diagnostics ?? [];
};

const bump = (counts: Counts, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

const dirOf = (file: string) =>
  file.includes("/") ? (file.split("/")[0] ?? file) : ".";

const countAll = (diagnostics: Diagnostic[]): Baseline => {
  const rules: Counts = {};
  const dirs: Counts = {};
  for (const diagnostic of diagnostics) {
    bump(rules, diagnostic.code);
    bump(dirs, dirOf(diagnostic.filename));
  }
  return {
    total: diagnostics.length,
    rules: sortKeys(rules),
    dirs: sortKeys(dirs),
  };
};

const sortKeys = (counts: Counts): Counts =>
  Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))
  );

const rises = (label: string, now: Counts, before: Counts) =>
  Object.entries(now)
    .filter(([key, count]) => count > (before[key] ?? 0))
    .map(([key, count]) => `${label} ${key}: ${before[key] ?? 0} -> ${count}`);

const budgetBreaks = (diagnostics: Diagnostic[]) =>
  diagnostics
    .filter((diagnostic) =>
      BUDGET_ZERO.some((prefix) => diagnostic.filename.startsWith(prefix))
    )
    .map((diagnostic) => `budget-0 ${diagnostic.filename}: ${diagnostic.code}`);

const readBaseline = (): Baseline | undefined =>
  existsSync(BASELINE)
    ? JSON.parse(readFileSync(BASELINE, "utf-8"))
    : undefined;

const write = (baseline: Baseline) =>
  writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);

const report = (lines: string[], ok: string) => {
  process.stdout.write(`${lines.length > 0 ? lines.join("\n") : ok}\n`);
  return lines.length > 0 ? 1 : 0;
};

const main = () => {
  const diagnostics = lint();
  const now = countAll(diagnostics);
  const before = readBaseline();
  const update = process.argv.includes("--update");
  if (!before) {
    return update
      ? (write(now),
        report([], `lint-gate: baseline recorded, ${now.total} diagnostics`))
      : report(["lint-gate: no baseline; run with --update"], "");
  }
  const problems = [
    ...rises("rule", now.rules, before.rules),
    ...rises("dir", now.dirs, before.dirs),
    ...budgetBreaks(diagnostics),
  ];
  if (update && problems.length === 0) {
    write(now);
  }
  return report(
    problems,
    `lint-gate: pass, ${now.total} diagnostics (baseline ${before.total})${update ? ", baseline lowered" : ""}`
  );
};

process.exitCode = main();
