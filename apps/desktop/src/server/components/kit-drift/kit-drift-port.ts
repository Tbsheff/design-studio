import path from "node:path";

import { loadTypeScript } from "./deps.js";
import type { Project } from "./deps.js";
import type { DriftMatch, DriftTag } from "./engine/index.js";
import { getImportPath } from "./kit-drift-import.js";
import type { ImportScope } from "./kit-drift-import.js";
import { toLookInventory } from "./kit-drift-look.js";
import { listDriftIn } from "./kit-drift-scan.js";
import type { FileDrift } from "./kit-drift-scan.js";
import { getKitInventory, isInsideKit } from "./kit-inventory.js";

interface PortKitFind {
  readonly component: string;
  readonly file: string;
  readonly id: string | null;
  readonly importPath: string;
  readonly isHigh: boolean;
  readonly line: number;
  readonly tag: DriftTag;
}

interface Located {
  readonly absolute: string;
  readonly match: DriftMatch;
}

interface PortKitScope {
  readonly project: Project;
  readonly workTree: string;
}

const toRelative = (workTree: string, absolute: string): string =>
  path.relative(workTree, absolute).split(path.sep).join("/");

const toFindId = (match: DriftMatch): string | null => {
  if (match.skip === null) {
    return match.id;
  }

  return null;
};

const toDriftFind = async (
  imports: ImportScope,
  workTree: string,
  located: Located
): Promise<PortKitFind> => {
  const { absolute, match } = located;

  return {
    component: match.component,
    file: toRelative(workTree, absolute),
    id: toFindId(match),
    importPath: await getImportPath(imports, match.component, absolute),
    isHigh: match.confidence === "high",
    line: match.line,
    tag: match.tag,
  };
};

const listDriftFinds = async (
  imports: ImportScope,
  workTree: string,
  drift: readonly FileDrift[]
): Promise<PortKitFind[]> => {
  const located = drift.flatMap((entry) =>
    entry.matches.map((match) => ({ absolute: entry.absolute, match }))
  );

  return await Promise.all(
    located.map((entry) => toDriftFind(imports, workTree, entry))
  );
};

const toAbsolutes = (workTree: string, files: readonly string[]): string[] =>
  [...new Set(files)].flatMap((file) => {
    const absolute = path.resolve(workTree, file);

    if (absolute.startsWith(workTree + path.sep)) {
      return [absolute];
    }

    return [];
  });

const listKitFinds = async (
  scope: PortKitScope,
  files: readonly string[]
): Promise<PortKitFind[] | null> => {
  const ts = await loadTypeScript();

  if (ts === null) {
    return null;
  }

  const inventory = toLookInventory(
    ts,
    await getKitInventory(ts, scope.project, scope.workTree)
  );

  if (inventory.entries.size === 0) {
    return null;
  }

  const absolutes = toAbsolutes(scope.workTree, files).filter(
    (absolute) => !isInsideKit(inventory, absolute)
  );

  const { project } = scope;
  const imports: ImportScope = { inventory, project, ts };
  const drift = await listDriftIn(ts, inventory, absolutes);
  const finds = await listDriftFinds(imports, scope.workTree, drift);

  return finds.toSorted(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line
  );
};

const listPortKitFinds = async (
  scope: PortKitScope,
  files: readonly string[]
): Promise<PortKitFind[] | null> => {
  try {
    return await listKitFinds(scope, files);
  } catch {
    return null;
  }
};

export { listPortKitFinds };

export type { PortKitFind, PortKitScope };
