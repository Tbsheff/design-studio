import { execFileSync } from "node:child_process";
import { matchesGlob } from "node:path";

import type { OxlintOverride } from "oxlint";

import { COARSE_FOLDERS, coarse } from "../lint/coarse.ts";

type Pattern = { group: string[] };

const TEST_ONLY_GROUPS = new Set(["node:*", "**/test-fakes*", "**/testing/**"]);
const TEST_FILE = /\.test\.tsx?$/u;

const tracked = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" }).split("\n").filter(Boolean);

const patternsOf = (options: unknown): Pattern[] =>
  typeof options === "object" && options !== null && "patterns" in options && Array.isArray(options.patterns) ? options.patterns : [];

const groupsOf = (entry: OxlintOverride) => {
  const setting = entry.rules?.["no-restricted-imports"];
  return new Set((Array.isArray(setting) ? patternsOf(setting[1]) : []).flatMap((pattern) => pattern.group));
};

const IMPORT_ROWS = coarse.filter((entry) => entry.rules?.["no-restricted-imports"] !== undefined);

const folderOf = (file: string) =>
  Object.keys(COARSE_FOLDERS).find((folder) => file.startsWith(`${folder}/`)) as keyof typeof COARSE_FOLDERS | undefined;

const exempt = (file: string, group: string) => TEST_ONLY_GROUPS.has(group) && TEST_FILE.test(file);

const problemsOf = (file: string) => {
  const folder = folderOf(file);
  const matching = IMPORT_ROWS.filter((entry) => entry.files.some((glob) => matchesGlob(file, glob)));
  const last = matching.at(-1);
  if (!folder || !last) {
    return folder ? [`${file}: no coarse override matches`] : [];
  }
  const effective = groupsOf(last);
  const required = COARSE_FOLDERS[folder].flatMap((pattern) => pattern.group);
  const earlier = matching.slice(0, -1).flatMap((entry) => [...groupsOf(entry)]);
  return [...required, ...earlier]
    .filter((group) => !effective.has(group) && !exempt(file, group))
    .map((group) => `${file}: the last coarse override drops ${group}`);
};

const problems = [...new Set(tracked.flatMap(problemsOf))];
process.stdout.write(
  problems.length > 0
    ? `${problems.join("\n")}\n`
    : `check-coarse: ${tracked.length} files; every file's last coarse override keeps the coarse bans and every earlier pattern\n`
);
process.exitCode = problems.length > 0 ? 1 : 0;
