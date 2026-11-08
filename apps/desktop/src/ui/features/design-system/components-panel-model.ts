import type { ComponentInfo } from "@design-studio/contracts";
import type { InsertableComponent } from "@design-studio/contracts/insert";

interface Item {
  key: string;
  info: ComponentInfo;
  insert: InsertableComponent | null;
  folder: string;
}

const insertItems = (
  insertable: InsertableComponent[],
  inventory: ComponentInfo[]
): Item[] =>
  insertable.map((component) => {
    const known = inventory.find(
      (item) => item.name === component.name && item.file === component.file
    );

    const info: ComponentInfo = known ?? {
      file: component.file,
      id: component.name,
      line: component.line,
      name: component.name,
      selector: null,
      source: "react",
      uses: component.uses,
    };

    return {
      folder: component.folder,
      info: { ...info, uses: component.uses },
      insert: component,
      key: component.id,
    };
  });

const toPlainItems = (components: ComponentInfo[] | null): Item[] | null => {
  if (!components) {
    return null;
  }

  return components.map((component) => ({
    folder: "",
    info: component,
    insert: null,
    key: component.id,
  }));
};

const isNeedleMatch = (item: Item, needle: string): boolean =>
  !needle ||
  item.info.name.toLowerCase().includes(needle) ||
  item.folder.toLowerCase().includes(needle);

const groupsOf = (items: Item[]): [string, Item[]][] => {
  const groups = new Map<string, Item[]>();

  for (const item of items) {
    groups.set(item.folder, [...(groups.get(item.folder) ?? []), item]);
  }

  return [...groups.entries()];
};

const toUses = (uses: number): string => {
  if (uses === 1) {
    return "1 use";
  }

  return `${uses} uses`;
};

const toMeta = (component: ComponentInfo): string => {
  const file = component.file?.split("/").pop() ?? "";
  const uses = toUses(component.uses);

  if (file) {
    return `${uses} · ${file}`;
  }

  return uses;
};

const toFileSuffix = (file: string | null | undefined): string => {
  if (file) {
    return ` · ${file}`;
  }

  return "";
};

const toCardTip = (item: Item): string => {
  if (item.insert) {
    return `Click to mention @${item.info.name}. Drag onto the canvas to insert it.`;
  }

  return `Add @${item.info.name} to your message${toFileSuffix(item.info.file)}`;
};

const toEmptyText = (canInsert: boolean): string => {
  if (canInsert) {
    return "No exported React components yet. Components in src, or in the app and its workspace packages, show here.";
  }

  return "No components yet. Parts the page repeats, like cards, show here.";
};

const toFootText = (canInsert: boolean): string => {
  if (canInsert) {
    return "Drag onto the canvas, or select an element and press + to insert. Click to mention.";
  }

  return "Click a component to mention it in your message.";
};

export {
  groupsOf,
  insertItems,
  isNeedleMatch,
  toCardTip,
  toEmptyText,
  toFootText,
  toMeta,
  toPlainItems,
};

export type { Item };
