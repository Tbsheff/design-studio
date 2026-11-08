import type { KitDriftSchema } from "@design-studio/actions/kit-drift/schema";

import type { Project } from "./deps.js";
import type { DriftMatch } from "./engine/index.js";
import { getImportPath } from "./kit-drift-import.js";
import type { ImportScope } from "./kit-drift-import.js";
import { listDriftFiles } from "./kit-drift-scan.js";
import type { FileDrift } from "./kit-drift-scan.js";
import { getKitInventory } from "./kit-inventory.js";
import type { KitInventory } from "./kit-inventory.js";
import type { Ts } from "./ts-type.js";

type KitDrift = typeof KitDriftSchema.Type;

interface ListKitDriftCommand {
  readonly cursor: string | null;
  readonly directionId: string | null;
  readonly limit: number;
  readonly page: string | null;
  readonly projectId: string;
}

interface KitDriftPage {
  readonly items: readonly KitDrift[];
  readonly next: string | null;
}

interface Located {
  readonly absolute: string;
  readonly match: DriftMatch;
}

const toOffset = (cursor: string | null): number => {
  const offset = Number(cursor ?? "0");

  if (Number.isInteger(offset) && offset >= 0) {
    return offset;
  }

  return 0;
};

const listLocated = (files: readonly FileDrift[]): Located[] =>
  files.flatMap((entry) =>
    entry.matches.map((match) => ({ absolute: entry.absolute, match }))
  );

const toItem = (located: Located, importPath: string): KitDrift => {
  const { match } = located;

  return {
    column: match.column,
    confidence: match.confidence,
    droppedClasses: match.droppedClasses,
    file: match.file,
    id: match.id,
    keptClasses: match.keptClasses,
    kitComponent: { importPath, name: match.component },
    line: match.line,
    suggestedSize: match.suggestedSize,
    suggestedVariant: match.suggestedVariant,
    tag: match.tag,
  };
};

const listItems = async (
  scope: ImportScope,
  slice: readonly Located[]
): Promise<KitDrift[]> => {
  const paths = new Map<string, Promise<string>>();

  const items = slice.map(async (located) => {
    const key = `${located.match.component}|${located.absolute}`;
    const known = paths.get(key);

    if (known) {
      return toItem(located, await known);
    }

    const pending = getImportPath(
      scope,
      located.match.component,
      located.absolute
    );

    paths.set(key, pending);

    return toItem(located, await pending);
  });

  return await Promise.all(items);
};

const listKitDriftPage = async (
  ts: Ts,
  project: Project,
  inventory: KitInventory,
  command: ListKitDriftCommand
): Promise<KitDriftPage> => {
  const files = await listDriftFiles(ts, inventory, command.page);
  const located = listLocated(files);
  const offset = toOffset(command.cursor);
  const end = offset + command.limit;

  const items = await listItems(
    { inventory, project, ts },
    located.slice(offset, end)
  );

  let next: string | null = null;

  if (end < located.length) {
    next = String(end);
  }

  return { items, next };
};

const runKitDriftList = async (
  ts: Ts,
  project: Project,
  workTree: string,
  command: ListKitDriftCommand
): Promise<KitDriftPage> => {
  const inventory = await getKitInventory(ts, project, workTree);

  return await listKitDriftPage(ts, project, inventory, command);
};

export { runKitDriftList };

export type { KitDriftPage, ListKitDriftCommand };
