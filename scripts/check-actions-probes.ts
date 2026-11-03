import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

interface Planted {
  readonly names: readonly string[];
  readonly temp: string;
}

const ROOT = path.join(import.meta.dirname, "..");

const PROBE_DIR = "scripts/stamp/probes";

const PROBE_TSC = "node_modules/typescript/bin/tsc";

const PROBE_BUFFER = 67_108_864;

const ERROR_LINE = /^(?<file>\S+?)\(\d+,\d+\): error /u;

const TS_SUFFIX = /\.ts$/u;

const PATH_SEPARATOR = /[\\/]/u;

const KEYS_FILE = "scripts/check-actions-probes.ts";

const ACTION_GUARDS = "src/shared/actions/_core/action.ts";

const HANDLER_GUARDS = "src/server/handlers/_core/handler.ts";

const LAYER_GUARD = "src/server/main/runtime-check.ts";

const PROBES = {
  "action-needs-confirm-user": {
    guard: ACTION_GUARDS,
    key: "actionNeedsConfirmUser",
  },
  "every-layer-provided": {
    guard: LAYER_GUARD,
    key: "not assignable to type 'ProbeUnwired'",
  },
  "missing-agent-short": {
    guard: ACTION_GUARDS,
    key: "Property 'short' is missing",
  },
  "missing-path-param": { guard: ACTION_GUARDS, key: "missingPathParam" },
  "missing-preview": {
    guard: HANDLER_GUARDS,
    key: "Property 'preview' is missing",
  },
  "path-param-not-string": { guard: ACTION_GUARDS, key: "pathParamNotString" },
  "preview-only-layer": {
    guard: LAYER_GUARD,
    key: "not assignable to type 'ProbePreviewOnly'",
  },
  "project-scope-needs-project-id": {
    guard: ACTION_GUARDS,
    key: "projectScopeNeedsProjectId",
  },
  "read-action-needs-get": { guard: ACTION_GUARDS, key: "readActionNeedsGet" },
  "read-handler-write-service": {
    guard: HANDLER_GUARDS,
    key: `Type '"write"' is not assignable to type '"read"'`,
  },
  "undeclared-error": {
    guard: HANDLER_GUARDS,
    key: "'NotFound' is not assignable to type 'never'",
  },
} satisfies Record<string, { readonly guard: string; readonly key: string }>;

const runProcess = promisify(execFile);

const isProbeName = (name: string): name is keyof typeof PROBES =>
  Object.hasOwn(PROBES, name);

const plantProbes = async (): Promise<Planted> => {
  const temp = await mkdtemp(path.join(ROOT, ".probes-"));
  const target = path.join(temp, "stamp", "probes");
  const listed = await readdir(path.join(ROOT, PROBE_DIR));
  const files = listed.filter((file) => TS_SUFFIX.test(file));

  await mkdir(target, { recursive: true });

  await Promise.all(
    files.map((file) =>
      copyFile(path.join(ROOT, PROBE_DIR, file), path.join(target, file))
    )
  );

  await writeFile(
    path.join(temp, "tsconfig.json"),
    JSON.stringify({
      extends: "../tsconfig.base.json",
      include: ["stamp/probes/*.ts"],
    })
  );

  return { names: files.map((file) => file.replace(TS_SUFFIX, "")), temp };
};

const typecheckProbes = async (temp: string): Promise<string> => {
  const args = [
    PROBE_TSC,
    "--noEmit",
    "--pretty",
    "false",
    "-p",
    path.join(temp, "tsconfig.json"),
  ];

  try {
    const { stdout } = await runProcess(process.execPath, args, {
      cwd: ROOT,
      encoding: "utf-8",
      maxBuffer: PROBE_BUFFER,
    });

    return stdout;
  } catch (error) {
    const failed: { readonly stdout?: string } = error ?? {};

    return failed.stdout ?? "";
  }
};

const probeNameOf = (file: string): string =>
  (file.split(PATH_SEPARATOR).at(-1) ?? "").replace(TS_SUFFIX, "");

const currentProbe = (line: string, current: string): string => {
  const file = ERROR_LINE.exec(line)?.groups?.["file"] ?? null;

  if (file === null) {
    return current;
  }

  if (file.includes(".probes-")) {
    return probeNameOf(file);
  }

  return "";
};

const errorsByProbe = (output: string): Map<string, string> => {
  const found = new Map<string, string>();

  let current = "";

  for (const line of output.split("\n")) {
    current = currentProbe(line, current);

    if (current !== "") {
      found.set(current, `${found.get(current) ?? ""}${line}\n`);
    }
  }

  return found;
};

const probeProblem = (name: string, errors: string | null): string | null => {
  const file = `${PROBE_DIR}/${name}.ts`;

  if (!isProbeName(name)) {
    return `P2 ${file} has no expected tsc error key. fix: add ${name} to PROBES in ${KEYS_FILE}`;
  }

  const { guard, key } = PROBES[name];

  if (errors === null) {
    return `P1 ${file} compiles clean, expected ${key}. fix: restore the guard in ${guard}`;
  }

  if (!errors.includes(key)) {
    return `P1 ${file} fails without ${key}. fix: restore the guard in ${guard}, or update PROBES in ${KEYS_FILE}`;
  }

  return null;
};

const missingProbes = (names: readonly string[]): string[] =>
  Object.keys(PROBES)
    .filter((name) => !names.includes(name))
    .map(
      (name) =>
        `P3 ${PROBE_DIR}/${name}.ts is missing. fix: restore the probe file`
    );

const problemsOf = (planted: Planted, output: string): string[] => {
  const found = errorsByProbe(output);

  const problems = planted.names.flatMap((name) => {
    const problem = probeProblem(name, found.get(name) ?? null);

    if (problem === null) {
      return [];
    }

    return [problem];
  });

  return [...problems, ...missingProbes(planted.names)];
};

const checkProbes = async (): Promise<number> => {
  const planted = await plantProbes();

  try {
    const output = await typecheckProbes(planted.temp);
    const problems = problemsOf(planted, output);
    const failed = problems.length > 0;

    let verdict = "pass";

    if (failed) {
      verdict = "fail";
    }

    const summary = `check-actions --probes: ${verdict}, ${planted.names.length} probes`;

    process.stdout.write(`${[...problems, summary].join("\n")}\n`);

    return Number(failed);
  } finally {
    await rm(planted.temp, { force: true, recursive: true });
  }
};

export { checkProbes };
