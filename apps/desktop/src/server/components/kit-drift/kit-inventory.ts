import path from "node:path";

import { loadLibrary } from "./deps.js";
import type { Project } from "./deps.js";
import type { KitComponent } from "./engine/index.js";
import { getKitCva } from "./scan-kit-cva.js";
import type { Ts } from "./ts-type.js";

type Library = Awaited<ReturnType<typeof loadLibrary>>;

interface KitEntryRef {
  readonly absolute: string;
  readonly kind: "default" | "named";
  readonly local: string;
  readonly name: string;
}

interface KitInventory {
  readonly appRoot: string;
  readonly components: ReadonlyMap<string, KitComponent>;
  readonly entries: ReadonlyMap<string, KitEntryRef>;
  readonly kitDirs: readonly string[];
  readonly library: Library;
  readonly root: string;
}

const KIT_NAMES: ReadonlySet<string> = new Set([
  "Button",
  "Input",
  "Label",
  "NativeSelect",
  "Skeleton",
  "Table",
  "Textarea",
]);

const LOOK_NAMES: ReadonlySet<string> = new Set(["Badge", "Card"]);

const LITERAL_PATTERN =
  /"(?<double>[^"\n]*)"|'(?<single>[^'\n]*)'|`(?<tick>[^`\n]*)`/gu;

const SPACE_PATTERN = /\s+/u;

const isKitFile = (library: Library, absolute: string): boolean => {
  const appRoot = library.scan.at(-1) ?? library.root;

  if (library.scan.length > 1) {
    return !absolute.startsWith(appRoot + path.sep);
  }

  return absolute.split(path.sep).includes("ui");
};

const listLiteralWords = (code: string): string[] =>
  [...code.matchAll(LITERAL_PATTERN)].flatMap((match) => {
    const { double, single, tick } = match.groups ?? {};

    return (double ?? single ?? tick ?? "")
      .split(SPACE_PATTERN)
      .filter((word) => word !== "");
  });

const toKitComponent = (
  ts: Ts,
  entry: KitEntryRef,
  code: string
): KitComponent => {
  const cva = getKitCva(ts, code, entry.absolute);

  if (cva === null) {
    return { base: listLiteralWords(code), groups: [], name: entry.name };
  }

  return {
    base: cva.base.split(SPACE_PATTERN).filter((word) => word !== ""),
    groups: cva.groups,
    name: entry.name,
  };
};

const listKitEntries = (
  library: Library,
  names: ReadonlySet<string>
): KitEntryRef[] => {
  const seen = new Set<string>();
  const found: KitEntryRef[] = [];

  for (const entry of library.entries) {
    const isWanted =
      names.has(entry.name) &&
      !seen.has(entry.name) &&
      isKitFile(library, entry.absolute);

    if (isWanted) {
      seen.add(entry.name);
      found.push({
        absolute: entry.absolute,
        kind: entry.kind,
        local: entry.local,
        name: entry.name,
      });
    }
  }

  return found;
};

const getKitInventory = async (
  ts: Ts,
  project: Project,
  workTree: string
): Promise<KitInventory> => {
  const library = await loadLibrary(project, workTree);
  const refs = listKitEntries(library, KIT_NAMES);
  const components = new Map<string, KitComponent>();
  const entries = new Map<string, KitEntryRef>();

  for (const ref of refs) {
    const code = library.texts.get(ref.absolute) ?? "";

    entries.set(ref.name, ref);
    components.set(ref.name, toKitComponent(ts, ref, code));
  }

  const dirs = new Set<string>(library.scan.slice(0, -1));

  for (const ref of refs) {
    dirs.add(path.dirname(ref.absolute));
  }

  const appRoot = library.scan.at(-1) ?? library.root;
  const { root } = library;
  const kitDirs = [...dirs];

  return { appRoot, components, entries, kitDirs, library, root };
};

const isInsideKit = (inventory: KitInventory, absolute: string): boolean =>
  inventory.kitDirs.some((dir) => absolute.startsWith(dir + path.sep));

const listLookEntries = (
  inventory: KitInventory
): ReadonlyMap<string, KitEntryRef> =>
  new Map(
    listKitEntries(inventory.library, LOOK_NAMES).map((ref) => [ref.name, ref])
  );

export { getKitInventory, isInsideKit, listLookEntries };

export type { KitEntryRef, KitInventory };
