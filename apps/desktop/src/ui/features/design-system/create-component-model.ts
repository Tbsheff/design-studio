import type { SelectionContext } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";

import type { ComponentFolder } from "../../../shared/component-create.js";

const TAG_NAMES = new Map([
  ["a", "NavItem"],
  ["article", "Card"],
  ["button", "ActionButton"],
  ["img", "Picture"],
  ["li", "ListItem"],
  ["section", "Section"],
  ["tr", "TableRow"],
]);

const DEFAULT_FOLDER = "src/components";
const KEBAB_FOLDER = /(?:^|\/)(?:ui|packages)(?:\/|$)/u;
const CAPITAL_START = /^[A-Z]/u;

const toFallbackName = (count: number): string => {
  if (count > 1) {
    return "Row";
  }

  return "Block";
};

const suggestName = (selection: SelectionContext[]): string => {
  const tag = (selection[0]?.tag ?? "div").toLowerCase();
  const base = TAG_NAMES.get(tag) ?? toFallbackName(selection.length);
  const component = selection[0]?.component ?? "";

  if (CAPITAL_START.test(component)) {
    return `${component}Item`;
  }

  return base;
};

const targetOf = (selection: SelectionContext): InsertTarget => {
  if (selection.usedAt && selection.usedBy?.root) {
    return {
      selector: selection.selector,
      source: selection.usedAt,
      tag: selection.usedBy.name.toLowerCase(),
    };
  }

  if (selection.owners?.length) {
    return {
      owners: selection.owners,
      selector: selection.selector,
      source: selection.source,
      tag: selection.tag.toLowerCase(),
    };
  }

  return {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };
};

const fileHint = (
  folder: string,
  name: string,
  known: ComponentFolder | null
): string => {
  const kebab = known?.kebab ?? KEBAB_FOLDER.test(folder);

  if (kebab) {
    return `${folder}/${name
      .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$<lower>-$<upper>")
      .toLowerCase()}.tsx`;
  }

  return `${folder}/${name}.tsx`;
};

const toInitialFolder = (
  folders: ComponentFolder[],
  note: string | null | undefined
): string => {
  const app = folders.find((item) => item.kind === "app")?.folder ?? null;

  if (app !== null) {
    return app;
  }

  const first = folders[0]?.folder ?? null;

  if (first !== null) {
    return first;
  }

  if (note) {
    return "";
  }

  return DEFAULT_FOLDER;
};

const toFolderNote = (
  folders: ComponentFolder[],
  note: string | null | undefined
): string | null => {
  if (folders.length > 0) {
    return null;
  }

  return note ?? null;
};

const toDescription = (count: number): string => {
  if (count === 1) {
    return "Writes a component file from this element and uses it in its place.";
  }

  return `Writes one component from these ${count} elements, with a prop for each part that differs, and uses it in their place.`;
};

const toWithProps = (props: string): string => {
  if (props) {
    return ` with ${props}`;
  }

  return "";
};

const toTimes = (count: number): string => {
  if (count === 1) {
    return "";
  }

  return "s";
};

const toCreatedMessage = (
  name: string,
  file: string,
  props: string,
  uses: number
): string =>
  `Created ${name} in ${file}${toWithProps(props)}, used ${uses} time${toTimes(uses)}.`;

const toSubmitLabel = (isPending: boolean): string => {
  if (isPending) {
    return "Creating…";
  }

  return "Create component";
};

const toFolderPlaceholder = (folders: ComponentFolder[] | null): string => {
  if (folders === null) {
    return "Loading…";
  }

  return "No folder";
};

const toHelpClass = (nameProblem: string | null): string => {
  if (nameProblem) {
    return "cc-help error";
  }

  return "cc-help";
};

export {
  fileHint,
  suggestName,
  targetOf,
  toCreatedMessage,
  toDescription,
  toFolderNote,
  toFolderPlaceholder,
  toHelpClass,
  toInitialFolder,
  toSubmitLabel,
};
