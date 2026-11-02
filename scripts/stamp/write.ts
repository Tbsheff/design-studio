import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { ROOT, readOrEmpty } from "../gen-common.js";
import type { GeneratedFile } from "../gen-common.js";
import { buildAll, staleFiles, writeAll } from "../gen-routes.js";
import { fail } from "./args.js";

interface StampFile {
  readonly path: string;
  readonly text: string;
}

interface StampOptions {
  readonly isDryRun: boolean;
}

interface StampResult {
  readonly generated: readonly string[];
  readonly written: readonly string[];
}

const DECISIONS = path.join(ROOT, "lint/decisions.ts");
const OXLINT = path.join(ROOT, "node_modules/.bin/oxlint");
const OXFMT = path.join(ROOT, "node_modules/.bin/oxfmt");
const NEEDED_GLOBS = ["src/shared/actions/**", "src/server/**"];

const OVERRIDE_BLOCK =
  /\{\s*files:\s*\[(?<files>[^\]]*)\],\s*rules:\s*\{(?<rules>[^}]*)\}/gu;

const THROW_OFF = /"unicorn\/throw-new-error":\s*"off"/u;

const absolute = (file: string): string => path.resolve(ROOT, file);

const relative = (file: string): string => path.relative(ROOT, file);

const run = promisify(execFile);

const DIFF_BIN = "/usr/bin/diff";

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const refuseExisting = async (files: readonly StampFile[]): Promise<void> => {
  const found = await Promise.all(
    files.map((file) => exists(absolute(file.path)))
  );

  const taken = files.flatMap((file, index) => {
    if (found[index]) {
      return [file.path];
    }

    return [];
  });

  if (taken.length > 0) {
    fail(
      `The stamp does not overwrite files. These exist: ${taken.join(", ")}.`,
      "remove the files, or pick another name"
    );
  }
};

const writeNew = async (files: readonly StampFile[]): Promise<string[]> => {
  await refuseExisting(files);

  await Promise.all(
    files.map(async (file) => {
      await mkdir(path.dirname(absolute(file.path)), { recursive: true });
      await writeFile(absolute(file.path), file.text);
    })
  );

  return files.map((file) => absolute(file.path));
};

const removeAll = async (paths: readonly string[]): Promise<void> => {
  await Promise.all(paths.map((file) => rm(file, { force: true })));
};

const buildOrFail = async (): Promise<GeneratedFile[]> => {
  const build = await buildAll();

  if (build.errors.length > 0) {
    fail(build.errors.join("\n"), "pnpm exec tsx scripts/gen-routes.ts");
  }

  return build.files;
};

const regenerate = async (): Promise<string[]> => {
  const files = await buildOrFail();
  const stale = await staleFiles(files);

  await writeAll(files);

  return stale.map((file) => absolute(file));
};

const diffText = async (args: readonly string[]): Promise<string> => {
  try {
    const result = await run(DIFF_BIN, [...args], { encoding: "utf-8" });

    return result.stdout;
  } catch (error) {
    const stdout = (error as { readonly stdout?: unknown }).stdout ?? "";

    return String(stdout);
  }
};

const unifiedDiff = async (
  file: string,
  before: string,
  after: string
): Promise<string> => {
  const dir = await mkdtemp(path.join(tmpdir(), "stamp-"));
  const left = path.join(dir, "before");
  const right = path.join(dir, "after");

  await writeFile(left, before);
  await writeFile(right, after);

  const name = relative(file);

  const args = [
    "-u",
    "--label",
    `a/${name}`,
    "--label",
    `b/${name}`,
    left,
    right,
  ];

  const output = await diffText(args);

  await rm(dir, { force: true, recursive: true });

  return output;
};

const newFileDiffs = (files: readonly StampFile[]): Promise<string[]> =>
  Promise.all(
    files.map((file) => unifiedDiff(absolute(file.path), "", file.text))
  );

const generatedDiffs = async (): Promise<string[]> => {
  const files = await buildOrFail();

  const current = await Promise.all(
    files.map((file) => readOrEmpty(file.path))
  );

  const changed = files.filter((file, index) => current[index] !== file.text);

  return Promise.all(
    changed.map((file) =>
      unifiedDiff(file.path, current[files.indexOf(file)] ?? "", file.text)
    )
  );
};

const dryRun = async (files: readonly StampFile[]): Promise<StampResult> => {
  const written = await writeNew(files);

  try {
    const diffs = [...(await newFileDiffs(files)), ...(await generatedDiffs())];

    process.stdout.write(diffs.join(""));
  } finally {
    await removeAll(written);
  }

  return { generated: [], written: [] };
};

const turnsOffThrowNewError = (decisions: string): boolean =>
  [...decisions.matchAll(OVERRIDE_BLOCK)].some((match) => {
    const files = match.groups?.["files"] ?? "";
    const rules = match.groups?.["rules"] ?? "";

    return (
      THROW_OFF.test(rules) &&
      NEEDED_GLOBS.every((glob) => files.includes(`"${glob}"`))
    );
  });

const guardClean = async (): Promise<void> => {
  const decisions = await readFile(DECISIONS, "utf-8");

  if (!turnsOffThrowNewError(decisions)) {
    fail(
      "The clean step does not run: lint/decisions.ts does not turn off unicorn/throw-new-error for src/shared/actions/** and src/server/**. Its autofix breaks every TaggedError class.",
      "add that override in the merge step, then run the stamp again"
    );
  }
};

const runTool = async (bin: string, args: readonly string[]): Promise<void> => {
  if (!(await exists(bin))) {
    fail(`The stamp cannot find ${relative(bin)}.`, "pnpm install");
  }

  try {
    await run(bin, [...args], { cwd: ROOT, encoding: "utf-8" });
  } catch (error) {
    const stdout = (error as { readonly stdout?: unknown }).stdout ?? "";

    process.stderr.write(String(stdout));
  }
};

const clean = async (paths: readonly string[]): Promise<void> => {
  if (paths.length === 0) {
    return;
  }

  await guardClean();

  const files = paths.map((file) => relative(file));

  await runTool(OXLINT, ["--fix", ...files]);
  await runTool(OXFMT, ["--no-error-on-unmatched-pattern", ...files]);
};

const stamp = async (
  files: readonly StampFile[],
  options: StampOptions
): Promise<StampResult> => {
  if (options.isDryRun) {
    return dryRun(files);
  }

  await guardClean();

  const written = await writeNew(files);
  const generated = await regenerate();

  await clean([...written, ...generated]);

  return {
    generated: generated.map((file) => relative(file)),
    written: written.map((file) => relative(file)),
  };
};

export { clean, dryRun, regenerate, stamp, turnsOffThrowNewError, writeNew };

export type { StampFile, StampOptions, StampResult };
