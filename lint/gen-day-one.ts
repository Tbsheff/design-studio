import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { decisions, playwrightAll, vitestAll } from "./decisions.ts";
import { presetRules } from "./presets.ts";

type Diagnostic = { code: string; severity: string; filename: string };

const OUT = new URL("day-one.ts", import.meta.url);
const NEVER = /^(no-restricted-(imports|globals|properties)|boundaries\/.+|import\/no-cycle|typescript\/tsconfig-error)$/u;
const KNOWN: Record<string, unknown> = { ...presetRules, ...decisions.rules, ...vitestAll, ...playwrightAll };
const KNOWN_KEYS = Object.keys(KNOWN);
const PREFIX_ALIAS: Record<string, string> = { "react-hooks": "react" };

const keyOf = (code: string) => {
  const match = /^([\w-]+)\((.+)\)$/u.exec(code);
  const raw = match?.[1] ?? "eslint";
  const prefix = PREFIX_ALIAS[raw] ?? raw;
  const rule = match?.[2] ?? code;
  const direct = prefix === "eslint" ? rule : `${prefix}/${rule}`;
  return direct in KNOWN ? direct : (KNOWN_KEYS.find((key) => key.endsWith(`/${rule}`)) ?? direct);
};

const optionsOf = (key: string) => {
  const value = KNOWN[key];
  return Array.isArray(value) ? value.slice(1) : [];
};

const lint = (extra: string[]): Diagnostic[] => {
  const run = spawnSync("node_modules/.bin/oxlint", ["--format=json", ...extra], { encoding: "utf8", maxBuffer: 2 ** 31 - 1 });
  const parsed: { diagnostics?: Diagnostic[] } = JSON.parse(run.stdout || "{}");
  return parsed.diagnostics ?? [];
};

const collect = (hits: Map<string, Set<string>>, diagnostics: Diagnostic[]) => {
  let added = 0;
  for (const diagnostic of diagnostics) {
    const key = keyOf(diagnostic.code);
    if (diagnostic.severity !== "error" || NEVER.test(key)) {
      continue;
    }
    const files = hits.get(key) ?? new Set<string>();
    added += files.has(diagnostic.filename) ? 0 : 1;
    hits.set(key, files.add(diagnostic.filename));
  }
  return added;
};

const isOn = (key: string) => {
  const value = KNOWN[key];
  const level = Array.isArray(value) ? value[0] : value;
  return level !== undefined && level !== "off";
};

const addTwins = (hits: Map<string, Set<string>>) => {
  for (const [key, files] of [...hits.entries()].filter(([name]) => name.startsWith("typescript/"))) {
    const rule = key.slice("typescript/".length);
    for (const twin of KNOWN_KEYS.filter((name) => name !== key && name.endsWith(`/${rule}`) && isOn(name))) {
      hits.set(twin, new Set([...(hits.get(twin) ?? []), ...files]));
    }
  }
};

const render = (hits: Map<string, Set<string>>) => {
  const files = [...new Set([...hits.values()].flatMap((set) => [...set]))].sort();
  const index = new Map(files.map((file, position) => [file, position]));
  const rows = [...hits.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, set]) => `  [${JSON.stringify(key)}, ${JSON.stringify(optionsOf(key))}, [${[...set].map((file) => index.get(file)).sort((a = 0, b = 0) => a - b).join(",")}]],`);
  return [
    "import type { OxlintOverride } from \"oxlint\";",
    "",
    `const FILES = [\n${files.map((file) => `  ${JSON.stringify(file)},`).join("\n")}\n];`,
    "",
    `const RULES: [string, unknown[], number[]][] = [\n${rows.join("\n")}\n];`,
    "",
    "export const dayOne: OxlintOverride[] = RULES.map(([rule, options, hits]) => ({",
    "  files: hits.map((position) => FILES[position] ?? \"\"),",
    "  ...(rule.startsWith(\"vitest/\") ? { plugins: [\"vitest\"] } : {}),",
    "  rules: { [rule]: [\"warn\", ...options] },",
    "}));",
    "",
  ].join("\n");
};

const passes = (hits: Map<string, Set<string>>, extra: string[]) => {
  for (let round = 0; round < 4; round += 1) {
    const added = collect(hits, lint(extra));
    addTwins(hits);
    writeFileSync(OUT, render(hits));
    if (added === 0) {
      return round;
    }
  }
  return -1;
};

const main = () => {
  writeFileSync(OUT, "export const dayOne = [];\n");
  const hits = new Map<string, Set<string>>();
  const native = passes(hits, []);
  const typed = process.argv.includes("--type-aware") ? passes(hits, ["--type-aware"]) : 0;
  const pairs = [...hits.values()].reduce((sum, set) => sum + set.size, 0);
  process.stdout.write(`day-one: ${hits.size} rules, ${pairs} rule-file pairs, rounds ${native}/${typed}\n`);
  return native < 0 || typed < 0 ? 1 : 0;
};

process.exitCode = main();
