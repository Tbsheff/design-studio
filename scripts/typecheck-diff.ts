import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT_DIR = new URL("../artifacts/", import.meta.url);
const OUT = new URL("typecheck-diff.txt", OUT_DIR);
const BASELINE = new URL("typecheck-diff.baseline.txt", OUT_DIR);
const ERROR_LINE =
  /^(?<file>[^\s(][^(]*)\((?<line>\d+),\d+\): error (?<code>TS\d+)/u;

const errorsOf = (command: string, args: string[]) => {
  const run = spawnSync(command, args, {
    encoding: "utf-8",
    maxBuffer: 2 ** 31 - 1,
  });
  const keys = `${run.stdout}\n${run.stderr}`
    .split("\n")
    .map((line) => ERROR_LINE.exec(line.trim())?.groups)
    .filter((groups) => groups !== undefined)
    .map((groups) => `${groups.code} ${groups.file}:${groups.line}`);
  return new Set(keys);
};

const only = (left: Set<string>, right: Set<string>, mark: string) =>
  [...left].filter((key) => !right.has(key)).map((key) => `${mark} ${key}`);

const main = () => {
  const tsc = errorsOf("node", [
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "-p",
    "tsconfig.json",
  ]);
  const tsrs = errorsOf("node_modules/.bin/tsrs", [
    "--noEmit",
    "-p",
    "tsconfig.json",
  ]);
  const lines = [
    ...only(tsc, tsrs, "tsc-only"),
    ...only(tsrs, tsc, "tsrs-only"),
  ].sort();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, lines.length > 0 ? `${lines.join("\n")}\n` : "");
  const known = new Set(
    existsSync(BASELINE) ? readFileSync(BASELINE, "utf-8").split("\n") : []
  );
  const fresh = lines.filter((line) => !known.has(line));
  const summary = `typecheck-diff: tsc ${tsc.size} errors, tsrs ${tsrs.size} errors, ${lines.length} diff lines, ${fresh.length} new`;
  process.stdout.write(`${[summary, ...fresh].join("\n")}\n`);
  return fresh.length > 0 ? 1 : 0;
};

process.exitCode = main();
