import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const OXLINT = path.join(ROOT, "node_modules/.bin/oxlint");
const OXFMT = path.join(ROOT, "node_modules/.bin/oxfmt");
const LINT_FILE = /\.(?:ts|tsx|js|mjs|cjs)$/u;
const FORMAT_FILE = /\.(?:ts|tsx|css|json)$/u;
const ANCHOR_FILES = ["lint/anchor.ts"];
const CHUNK_SIZE = 400;
const LISTING_BUFFER = 268_435_456;

const fail = (reason) => {
  throw new Error(`pre-commit: ${reason}\nfix: repair the staged files, then commit again\n`);
};

const toStagedFiles = () => {
  const listing = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
    cwd: ROOT,
    encoding: "utf-8",
    maxBuffer: LISTING_BUFFER,
  });

  return listing.split("\0").filter((file) => file !== "" && existsSync(path.join(ROOT, file)));
};

const toChunks = (files) => {
  const chunks = [];

  for (let start = 0; start < files.length; start += CHUNK_SIZE) {
    chunks.push(files.slice(start, start + CHUNK_SIZE));
  }

  return chunks;
};

const runStep = (label, command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });

  if (result.error) {
    fail(`${label} did not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${label} failed with status ${result.status}`);
  }
};

const runLint = (files) => {
  for (const chunk of toChunks([...ANCHOR_FILES, ...files])) {
    runStep("oxlint", OXLINT, ["--", ...chunk]);
  }
};

const runFormat = (files) => {
  for (const chunk of toChunks(files)) {
    runStep("oxfmt", OXFMT, ["--check", "--no-error-on-unmatched-pattern", "--", ...chunk]);
  }
};

const runHook = () => {
  const staged = toStagedFiles();

  runLint(staged.filter((file) => LINT_FILE.test(file)));
  runFormat(staged.filter((file) => FORMAT_FILE.test(file)));
  runStep("lint:boundaries", OXLINT, ["-c", "oxlint.boundaries.config.ts", "apps", "packages"]);
};

try {
  runHook();
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 1;
}
