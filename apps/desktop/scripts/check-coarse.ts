import { execFileSync } from "node:child_process";
import { matchesGlob } from "node:path";

import type { OxlintOverride } from "oxlint";

import { COARSE_FOLDERS, coarse } from "../lint/coarse.ts";
import boundariesConfig from "../oxlint.boundaries.config.ts";
import mainConfig from "../oxlint.config.ts";
import fastConfig from "../oxlint.fast.config.ts";

interface Pattern {
  group: string[];
}

const TEST_ONLY_GROUPS = new Set(["node:*", "**/test-fakes*", "**/testing/**"]);
const TEST_FILE = /\.test\.tsx?$/u;

const tracked = execFileSync("git", ["ls-files", "src"], { encoding: "utf-8" })
  .split("\n")
  .filter(Boolean);

const patternsOf = (options: unknown): Pattern[] =>
  typeof options === "object" &&
  options !== null &&
  "patterns" in options &&
  Array.isArray(options.patterns)
    ? options.patterns
    : [];

const groupsOf = (entry: OxlintOverride) => {
  const setting = entry.rules?.["no-restricted-imports"];

  return new Set(
    (Array.isArray(setting) ? patternsOf(setting[1]) : []).flatMap(
      (pattern) => pattern.group
    )
  );
};

const IMPORT_ROWS = coarse.filter(
  (entry) => entry.rules?.["no-restricted-imports"] !== undefined
);

const folderOf = (file: string) =>
  Object.keys(COARSE_FOLDERS).find((folder) =>
    file.startsWith(`${folder}/`)
  ) as keyof typeof COARSE_FOLDERS | undefined;

const exempt = (file: string, group: string) =>
  TEST_ONLY_GROUPS.has(group) && TEST_FILE.test(file);

const problemsOf = (file: string) => {
  const folder = folderOf(file);

  const matching = IMPORT_ROWS.filter((entry) =>
    entry.files.some((glob) => matchesGlob(file, glob))
  );

  const last = matching.at(-1);

  if (!folder || !last) {
    return folder
      ? [
          `${file}: no coarse override matches\nfix: add an override for ${folder}/** in lint/coarse.ts`,
        ]
      : [];
  }

  const effective = groupsOf(last);
  const required = COARSE_FOLDERS[folder].flatMap((pattern) => pattern.group);

  const earlier = matching
    .slice(0, -1)
    .flatMap((entry) => [...groupsOf(entry)]);

  return [...required, ...earlier]
    .filter((group) => !effective.has(group) && !exempt(file, group))
    .map(
      (group) =>
        `${file}: the last coarse override drops ${group}\nfix: add ${group} to the last override that matches ${file} in lint/coarse.ts`
    );
};

interface RuleHolder {
  rules?: object;
}

interface Config extends RuleHolder {
  overrides?: RuleHolder[];
}

interface Entry {
  message?: string;
  patterns?: Entry[];
  paths?: Entry[];
}

type Setting = Entry | Entry[] | string | number | null | undefined;

const CONFIGS: [string, Config][] = [
  ["oxlint.config.ts", mainConfig],
  ["oxlint.fast.config.ts", fastConfig],
  ["oxlint.boundaries.config.ts", boundariesConfig],
];

const RESTRICTED = new Set([
  "no-restricted-imports",
  "no-restricted-globals",
  "no-restricted-properties",
]);

const ruleSetsOf = (config: Config): object[] => [
  config.rules ?? {},
  ...(config.overrides ?? []).map((entry): object => entry.rules ?? {}),
];

const listOf = (value: Setting): Entry[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const importEntries = (option: Entry): Entry[] => {
  if (Object(option) !== option) {
    return [option];
  }

  return [...listOf(option.patterns), ...listOf(option.paths)];
};

const entriesOf = (key: string, setting: Setting): Entry[] => {
  const options = listOf(setting).slice(1);

  if (key !== "no-restricted-imports") {
    return options;
  }

  return options.flatMap((option): Entry[] => importEntries(option));
};

const messageOf = (entry: Entry): string => String(entry?.message ?? "");

const L8_FIX = "and rewrite it as '<what is banned>. Use <X> from <path>.'";

const messageProblem = (name: string, entry: Entry): string =>
  `${name}: L8 message lacks 'Use ': ${JSON.stringify(entry)}\nfix: grep -rn ${JSON.stringify(messageOf(entry) || "no-restricted")} lint ${L8_FIX}`;

const messageProblems = ([name, config]: [string, Config]): string[] =>
  ruleSetsOf(config).flatMap((rules): string[] =>
    Object.entries(rules)
      .filter(([key]): boolean => RESTRICTED.has(key))
      .flatMap(([key, setting]): Entry[] => entriesOf(key, setting))
      .filter((entry): boolean => !messageOf(entry).includes("Use "))
      .map((entry): string => messageProblem(name, entry))
  );

const L9_FIX =
  "fix: grep -rn no-restricted-syntax lint oxlint.config.ts oxlint.fast.config.ts oxlint.boundaries.config.ts and move the ban to no-restricted-imports, no-restricted-globals or no-restricted-properties";

const syntaxProblems = ([name, config]: [string, Config]): string[] =>
  ruleSetsOf(config)
    .filter((rules): boolean => "no-restricted-syntax" in rules)
    .map((): string => `${name}: L9 has a no-restricted-syntax key\n${L9_FIX}`);

const problems = [
  ...new Set([
    ...tracked.flatMap(problemsOf),
    ...CONFIGS.flatMap((config): string[] => messageProblems(config)),
    ...CONFIGS.flatMap((config): string[] => syntaxProblems(config)),
  ]),
];

process.stdout.write(
  problems.length > 0
    ? `${problems.join("\n")}\n`
    : `check-coarse: ${tracked.length} files; every file's last coarse override keeps the coarse bans and every earlier pattern; every no-restricted-* message has 'Use ' (L8); no config has no-restricted-syntax (L9)\n`
);

process.exitCode = problems.length > 0 ? 1 : 0;
