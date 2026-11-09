import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { text } from "node:stream/consumers";

import { WORKSPACE_ROOT, toWorkspaceBin } from "./workspace-root.ts";

interface Diagnostic {
  code: string;
  filename: string;
  severity: string;
}
type Counts = Record<string, number>;

interface Baseline {
  total: number;
  rules: Counts;
  dirs: Counts;
}

const BASELINE = new URL("lint-baseline.json", import.meta.url);

const BUDGET_ZERO = [
  "apps/desktop/src/server/platform/",
  "apps/desktop/src/server/events/",
  "apps/desktop/src/server/run-log/",
  "apps/desktop/src/server/project-source/",
  "apps/desktop/src/server/page-probe/",
  "apps/desktop/src/server/handlers/",
  "apps/desktop/src/server/main/",
  "apps/desktop/src/server/ship/",
  "apps/desktop/src/server/agent-tools/",
  "packages/common/actions/src/",
  "packages/ui/src/",
  "apps/desktop/src/ui/domain/",
  "apps/desktop/src/ui/platform/",
  "apps/desktop/src/ui/features/",
  "apps/desktop/src/ui/app/",
];

const toGateFailure = (reason: string): never => {
  throw new Error(`lint-gate: ${reason}\nfix: pnpm run lint:gate\n`);
};

const LINT_EXIT_CODES = new Set([0, 1]);

interface OxlintRun {
  readonly error: Error | null;
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

const runOxlint = async (): Promise<OxlintRun> => {
  const child = spawn(
    toWorkspaceBin("oxlint"),
    ["-c", "oxlint.config.ts", "--format=json"],
    { cwd: WORKSPACE_ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );

  try {
    const [stdout, stderr, [status]] = await Promise.all([
      text(child.stdout),
      text(child.stderr),
      once(child, "close"),
    ]);

    return { error: null, status: status as number | null, stderr, stdout };
  } catch (error) {
    return { error: error as Error, status: null, stderr: "", stdout: "" };
  }
};

const lint = async (): Promise<Diagnostic[]> => {
  const run = await runOxlint();

  if (run.error) {
    return toGateFailure(`oxlint did not start: ${run.error.message}`);
  }

  if (run.status === null || !LINT_EXIT_CODES.has(run.status)) {
    return toGateFailure(`oxlint exit status ${run.status}: ${run.stderr}`);
  }

  if (run.stdout.trim() === "") {
    return toGateFailure("oxlint wrote no output");
  }

  const parsed: { diagnostics?: Diagnostic[] } = JSON.parse(run.stdout);

  if (parsed.diagnostics === undefined) {
    return toGateFailure("oxlint output has no diagnostics list");
  }

  return parsed.diagnostics;
};

const bump = (counts: Counts, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

const CLOUD_APP = /^apps\/(?:api|publish)\//u;

const DESKTOP_APP = /^apps\/desktop\//u;

const dirOf = (file: string) => {
  if (CLOUD_APP.test(file)) {
    return "cloud";
  }

  const tail = file.replace(DESKTOP_APP, "");

  return tail.includes("/") ? (tail.split("/")[0] ?? tail) : ".";
};

const countAll = (diagnostics: Diagnostic[]): Baseline => {
  const rules: Counts = {};
  const dirs: Counts = {};

  for (const diagnostic of diagnostics) {
    bump(rules, diagnostic.code);
    bump(dirs, dirOf(diagnostic.filename));
  }

  return {
    dirs: sortKeys(dirs),
    rules: sortKeys(rules),
    total: diagnostics.length,
  };
};

const sortKeys = (counts: Counts): Counts =>
  Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))
  );

const rises = (label: string, now: Counts, before: Counts) =>
  Object.entries(now).flatMap(([key, count]) => {
    if (count <= (before[key] ?? 0)) {
      return [];
    }

    return [`${label} ${key}: ${before[key] ?? 0} -> ${count}`];
  });

const isBudgetZero = (file: string) =>
  BUDGET_ZERO.some((prefix) => file.startsWith(prefix));

const budgetBreaks = (diagnostics: Diagnostic[]) =>
  diagnostics.flatMap((diagnostic) => {
    if (!isBudgetZero(diagnostic.filename)) {
      return [];
    }

    return [`budget-0 ${diagnostic.filename}: ${diagnostic.code}`];
  });

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

const main = async () => {
  const diagnostics = await lint();
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

const toExitCode = async (): Promise<number> => {
  try {
    return await main();
  } catch (error) {
    process.stderr.write(String(error));

    return 2;
  }
};

process.exitCode = await toExitCode();
