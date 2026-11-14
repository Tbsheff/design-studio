import type { KitDriftSchema } from "@design-studio/actions/kit-drift/schema";

import type { Project } from "./deps.js";
import type { DriftMatch, MarkupDrift } from "./engine/index.js";
import { getImportPath } from "./kit-drift-import.js";
import type { ImportScope } from "./kit-drift-import.js";
import { isKitPrototype, listPrototypeDrift } from "./kit-drift-prototype.js";
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

interface PageSlice<Value> {
  readonly next: string | null;
  readonly slice: readonly Value[];
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

const toPageSlice = <Value>(
  values: readonly Value[],
  command: ListKitDriftCommand
): PageSlice<Value> => {
  const offset = toOffset(command.cursor);
  const end = offset + command.limit;
  let next: string | null = null;

  if (end < values.length) {
    next = String(end);
  }

  return { next, slice: values.slice(offset, end) };
};

const toRank = (located: Located): number => {
  if (located.match.confidence === "high") {
    return 0;
  }

  return 1;
};

const listLocated = (files: readonly FileDrift[]): Located[] =>
  files
    .flatMap((entry) =>
      entry.matches.map((match) => ({ absolute: entry.absolute, match }))
    )
    .toSorted((left, right) => toRank(left) - toRank(right));

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
    parts: [],
    suggestedSize: match.suggestedSize,
    suggestedVariant: match.suggestedVariant,
    tag: match.tag,
    variant: null,
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
  const { next, slice } = toPageSlice(located, command);
  const items = await listItems({ inventory, project, ts }, slice);

  return { items, next };
};

const toMarkupItem = (drift: MarkupDrift): KitDrift => ({
  column: drift.column,
  confidence: drift.confidence,
  droppedClasses: drift.droppedClasses,
  file: drift.file,
  id: drift.id,
  keptClasses: drift.keptClasses,
  kitComponent: {
    importPath: drift.recipe.source,
    name: drift.recipe.component.name,
  },
  line: drift.line,
  parts: drift.parts.map((part) => part.component.name),
  suggestedSize: drift.suggestedSize,
  suggestedVariant: drift.suggestedVariant,
  tag: drift.tag,
  variant: drift.variant,
});

const listPrototypePage = async (
  project: Project,
  workTree: string,
  command: ListKitDriftCommand
): Promise<KitDriftPage> => {
  const drift = await listPrototypeDrift(project, workTree, command.page);
  const { next, slice } = toPageSlice(drift, command);

  return { items: slice.map((entry) => toMarkupItem(entry)), next };
};

const runKitDriftList = async (
  ts: Ts,
  project: Project,
  workTree: string,
  command: ListKitDriftCommand
): Promise<KitDriftPage> => {
  if (isKitPrototype(project)) {
    return await listPrototypePage(project, workTree, command);
  }

  const inventory = await getKitInventory(ts, project, workTree);

  return await listKitDriftPage(ts, project, inventory, command);
};

export { runKitDriftList };

export type { KitDriftPage, ListKitDriftCommand };
