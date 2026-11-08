import { readFile } from "node:fs/promises";

import { parseModuleFile, planImports, seenImports } from "./deps.js";
import type { ImportNeed, Project } from "./deps.js";
import { toRelativeBare } from "./kit-drift-paths.js";
import type { KitEntryRef, KitInventory } from "./kit-inventory.js";
import type { Ts } from "./ts-type.js";

interface ImportScope {
  readonly inventory: KitInventory;
  readonly project: Project;
  readonly ts: Ts;
}

const toNeed = (
  scope: ImportScope,
  entry: KitEntryRef,
  targetFile: string
): ImportNeed => ({
  allowPaths: scope.project.app?.framework === "next",
  componentFile: entry.absolute,
  kind: entry.kind,
  name: entry.name,
  root: scope.inventory.root,
  seen: seenImports(scope.inventory.library.specifiers),
  targetFile,
});

const getImportPath = async (
  scope: ImportScope,
  name: string,
  targetFile: string
): Promise<string> => {
  const entry = scope.inventory.entries.get(name) ?? null;

  if (entry === null) {
    return "";
  }

  const fallback = toRelativeBare(scope.inventory.root, entry.absolute);

  try {
    const code = await readFile(targetFile, "utf-8");
    const ast = parseModuleFile(code, targetFile);

    if (ast === null) {
      return fallback;
    }

    const plan = planImports(scope.ts, code, ast, [
      toNeed(scope, entry, targetFile),
    ]);

    return plan.items[0]?.specifier ?? fallback;
  } catch {
    return fallback;
  }
};

export { getImportPath, toNeed };

export type { ImportScope };
