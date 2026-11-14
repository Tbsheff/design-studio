import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadTypeScript } from "./deps.js";
import type { Project } from "./deps.js";
import { LOOK_TAGS, toTsxCardDrift } from "./engine/index.js";
import type { DriftMatch, DriftTag, TsxLookFind } from "./engine/index.js";
import { getImportPath } from "./kit-drift-import.js";
import type { ImportScope } from "./kit-drift-import.js";
import { listDriftIn } from "./kit-drift-scan.js";
import type { FileDrift } from "./kit-drift-scan.js";
import {
  getKitInventory,
  isInsideKit,
  listLookEntries,
} from "./kit-inventory.js";
import { listTaggedElements } from "./scan-elements.js";

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

interface LookScope {
  readonly hasBadge: boolean;
  readonly hasCard: boolean;
  readonly imports: ImportScope;
  readonly workTree: string;
}

const LOOK_COMPONENT: Readonly<Record<TsxLookFind["tag"], string>> = {
  badge: "Badge",
  card: "Card",
};

const toRelative = (workTree: string, absolute: string): string =>
  path.relative(workTree, absolute).split(path.sep).join("/");

const getText = async (absolute: string): Promise<string | null> => {
  try {
    return await readFile(absolute, "utf-8");
  } catch {
    return null;
  }
};

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

const listFileLooks = async (
  scope: LookScope,
  absolute: string
): Promise<PortKitFind[]> => {
  const code = await getText(absolute);

  if (code === null) {
    return [];
  }

  const elements = listTaggedElements(
    scope.imports.ts,
    absolute,
    code,
    LOOK_TAGS
  );

  const looks = toTsxCardDrift({
    code,
    elements,
    hasBadge: scope.hasBadge,
    hasCard: scope.hasCard,
  });

  return await Promise.all(
    looks.map(async (look) => {
      const component = LOOK_COMPONENT[look.tag];

      return {
        component,
        file: toRelative(scope.workTree, absolute),
        id: null,
        importPath: await getImportPath(scope.imports, component, absolute),
        isHigh: true,
        line: look.line,
        tag: look.tag,
      };
    })
  );
};

const listLookFinds = async (
  scope: LookScope,
  absolutes: readonly string[]
): Promise<PortKitFind[]> => {
  if (!scope.hasBadge && !scope.hasCard) {
    return [];
  }

  const found = await Promise.all(
    absolutes.map((absolute) => listFileLooks(scope, absolute))
  );

  return found.flat();
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

  const inventory = await getKitInventory(ts, scope.project, scope.workTree);
  const looks = listLookEntries(inventory);

  if (inventory.entries.size === 0 && looks.size === 0) {
    return null;
  }

  const absolutes = toAbsolutes(scope.workTree, files).filter(
    (absolute) => !isInsideKit(inventory, absolute)
  );

  const entries = new Map([...inventory.entries, ...looks]);

  const imports: ImportScope = {
    inventory: { ...inventory, entries },
    project: scope.project,
    ts,
  };

  const drift = await listDriftIn(ts, inventory, absolutes);

  const hasBadge = looks.has("Badge");
  const hasCard = looks.has("Card");
  const { workTree } = scope;
  const lookScope: LookScope = { hasBadge, hasCard, imports, workTree };

  const [raw, styled] = await Promise.all([
    listDriftFinds(imports, scope.workTree, drift),
    listLookFinds(lookScope, absolutes),
  ]);

  return [...raw, ...styled].toSorted(
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
