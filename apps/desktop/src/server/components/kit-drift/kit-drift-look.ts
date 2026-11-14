import { readFile, stat } from "node:fs/promises";

import {
  LOOK_COMPONENT,
  LOOK_SCAN_TAGS,
  toTsxLookMatches,
} from "./engine/index.js";
import type { DriftMatch, KitComponent, RawElement } from "./engine/index.js";
import { listLookEntries } from "./kit-inventory.js";
import type { KitEntryRef, KitInventory } from "./kit-inventory.js";
import { listTaggedElements } from "./scan-elements.js";
import { getKitCva } from "./scan-kit-cva.js";
import type { Ts, TsNode } from "./ts-type.js";

interface LookScan {
  readonly code: string;
  readonly elements: readonly RawElement[];
  readonly stamp: string;
}

const LOOK_HINT = /rounded/u;
const SPACE_PATTERN = /\s+/u;
const CLASS_ATTRIBUTE = "className";
const KILOBYTE = 1024;
const MAX_KILOBYTES = 512;
const MAX_BYTES = MAX_KILOBYTES * KILOBYTE;
const MAX_CACHE = 4000;
const cache = new Map<string, LookScan>();

const toWords = (text: string): string[] =>
  text.split(SPACE_PATTERN).filter((word) => word !== "");

const isDeclarationOf = (
  ts: Ts,
  node: TsNode,
  names: ReadonlySet<string>
): boolean => {
  if (ts.isFunctionDeclaration(node)) {
    return names.has(node.name?.text ?? "");
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return names.has(node.name.text);
  }

  return false;
};

const isClassSlot = (ts: Ts, parent: TsNode): boolean => {
  if (ts.isCallExpression(parent)) {
    return true;
  }

  return (
    ts.isJsxAttribute(parent) &&
    ts.isIdentifier(parent.name) &&
    parent.name.text === CLASS_ATTRIBUTE
  );
};

const listDeclarationWords = (
  ts: Ts,
  ref: KitEntryRef,
  code: string
): string[] => {
  const source = ts.createSourceFile(
    ref.absolute,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const names = new Set([ref.local, ref.name]);
  const words: string[] = [];
  let isFound = false;

  const collect = (node: TsNode): void => {
    const isText =
      ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

    if (isText && isClassSlot(ts, node.parent)) {
      words.push(...toWords(node.text));
    }

    ts.forEachChild(node, collect);
  };

  const visit = (node: TsNode): void => {
    if (isFound) {
      return;
    }

    if (isDeclarationOf(ts, node, names)) {
      isFound = true;
      collect(node);

      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return words;
};

const toLookComponent = (
  ts: Ts,
  ref: KitEntryRef,
  code: string
): KitComponent => {
  const cva = getKitCva(ts, code, ref.absolute);

  if (cva === null) {
    return {
      base: listDeclarationWords(ts, ref, code),
      groups: [],
      name: ref.name,
    };
  }

  return { base: toWords(cva.base), groups: cva.groups, name: ref.name };
};

const toLookInventory = (ts: Ts, inventory: KitInventory): KitInventory => {
  const looks = listLookEntries(inventory);

  if (looks.size === 0) {
    return inventory;
  }

  const components = new Map(inventory.components);
  const entries = new Map(inventory.entries);

  for (const ref of looks.values()) {
    const code = inventory.library.texts.get(ref.absolute) ?? "";

    entries.set(ref.name, ref);
    components.set(ref.name, toLookComponent(ts, ref, code));
  }

  return { ...inventory, components, entries };
};

const getLookScan = async (
  ts: Ts,
  absolute: string
): Promise<LookScan | null> => {
  const info = await stat(absolute);

  if (!info.isFile() || info.size > MAX_BYTES) {
    return null;
  }

  const stamp = `${info.mtimeMs}:${info.size}`;
  const known = cache.get(absolute) ?? null;

  if (known !== null && known.stamp === stamp) {
    return known;
  }

  const code = await readFile(absolute, "utf-8");
  let elements: readonly RawElement[] = [];

  if (LOOK_HINT.test(code)) {
    elements = listTaggedElements(ts, absolute, code, LOOK_SCAN_TAGS);
  }

  if (cache.size >= MAX_CACHE) {
    cache.clear();
  }

  const scan: LookScan = { code, elements, stamp };

  cache.set(absolute, scan);

  return scan;
};

const hasLookKit = (inventory: KitInventory): boolean =>
  inventory.components.has(LOOK_COMPONENT.badge) ||
  inventory.components.has(LOOK_COMPONENT.card);

const listFileLooks = async (
  ts: Ts,
  inventory: KitInventory,
  absolute: string,
  file: string
): Promise<DriftMatch[]> => {
  if (!hasLookKit(inventory)) {
    return [];
  }

  let scan: LookScan | null = null;

  try {
    scan = await getLookScan(ts, absolute);
  } catch {
    return [];
  }

  if (scan === null || scan.elements.length === 0) {
    return [];
  }

  const { code, elements } = scan;
  const kit = inventory.components;

  return toTsxLookMatches({ code, elements, file, kit });
};

export { listFileLooks, toLookInventory };
