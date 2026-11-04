import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { ACTIONS } from "./gen-common.js";
import type { GeneratedFile } from "./gen-common.js";
import { WORKSPACE_ROOT } from "./workspace-root.ts";

interface PackageManifest {
  readonly name: string;
}

const CONTRACTS = path.join(WORKSPACE_ROOT, "packages/common/contracts/src");
const CONTRACTS_ROOT_FILE = "contracts.ts";
const TS_SUFFIX = /\.ts$/u;
const CORE_INTERNAL = new Set(["_core/errors/index", "_core/errors/status"]);
const GENERATED_ROOT = new Set(["all-actions.generated", "index"]);

const toSourceFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  return entries.flatMap((entry) => {
    const isSource =
      entry.isFile() &&
      TS_SUFFIX.test(entry.name) &&
      !entry.name.endsWith(".test.ts");

    if (!isSource) {
      return [];
    }

    return [path.relative(dir, path.join(entry.parentPath, entry.name))];
  });
};

const isPublicAction = (stem: string): boolean =>
  !GENERATED_ROOT.has(stem) && !CORE_INTERNAL.has(stem);

const toEntry = (stem: string): [string, string] => [
  `./${stem}`,
  `./src/${stem}.ts`,
];

const toSortedEntries = (stems: readonly string[]): [string, string][] =>
  stems
    .toSorted((left, right) => left.localeCompare(right))
    .map((stem) => toEntry(stem));

const toActionEntries = async (): Promise<Record<string, string>> => {
  const files = await toSourceFiles(ACTIONS);

  const stems = files.flatMap((file) => {
    const stem = file.replace(TS_SUFFIX, "");

    if (!isPublicAction(stem)) {
      return [];
    }

    return [stem];
  });

  return Object.fromEntries([
    [".", "./src/index.ts"],
    ...toSortedEntries(stems),
  ]);
};

const toContractEntries = async (): Promise<Record<string, string>> => {
  const files = await toSourceFiles(CONTRACTS);

  const stems = files.flatMap((file) => {
    if (file === CONTRACTS_ROOT_FILE) {
      return [];
    }

    return [file.replace(TS_SUFFIX, "")];
  });

  return Object.fromEntries([
    [".", `./src/${CONTRACTS_ROOT_FILE}`],
    ...toSortedEntries(stems),
  ]);
};

const toManifestFile = async (
  folder: string,
  exportsMap: Record<string, string>
): Promise<GeneratedFile> => {
  const file = path.join(WORKSPACE_ROOT, folder, "package.json");
  const manifest: PackageManifest = JSON.parse(await readFile(file, "utf-8"));

  return {
    path: file,
    text: `${JSON.stringify({ ...manifest, exports: exportsMap }, null, 2)}\n`,
  };
};

const toExportFiles = async (): Promise<GeneratedFile[]> => [
  await toManifestFile("packages/common/actions", await toActionEntries()),
  await toManifestFile("packages/common/contracts", await toContractEntries()),
];

export { toExportFiles };
