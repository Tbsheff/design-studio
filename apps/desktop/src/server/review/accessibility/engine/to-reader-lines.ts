interface ReaderNodeInput {
  readonly checked: boolean | null;
  readonly depth: number;
  readonly disabled: boolean;
  readonly expanded: boolean | null;
  readonly level: number | null;
  readonly loc: string | null;
  readonly name: string;
  readonly role: string;
  readonly selector: string;
}

interface ReaderLineStates {
  readonly isChecked: boolean | null;
  readonly isDisabled: boolean;
  readonly isExpanded: boolean | null;
  readonly level: number | null;
}

interface ReaderLine {
  readonly depth: number;
  readonly isNameMissing: boolean;
  readonly layerId: string | null;
  readonly name: string;
  readonly role: string;
  readonly selector: string;
  readonly states: ReaderLineStates;
}

interface ReaderPage {
  readonly items: readonly ReaderLine[];
  readonly next: string | null;
}

const NAME_REQUIRED = new Set([
  "button",
  "checkbox",
  "combobox",
  "dialog",
  "img",
  "link",
  "menuitem",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
]);

const toReaderLine = (node: ReaderNodeInput): ReaderLine => ({
  depth: node.depth,
  isNameMissing: NAME_REQUIRED.has(node.role) && node.name.trim() === "",
  layerId: node.loc,
  name: node.name.trim(),
  role: node.role,
  selector: node.selector,
  states: {
    isChecked: node.checked,
    isDisabled: node.disabled,
    isExpanded: node.expanded,
    level: node.level,
  },
});

const toReaderLines = (nodes: readonly ReaderNodeInput[]): ReaderLine[] =>
  nodes.map((node) => toReaderLine(node));

const toOffset = (cursor: string | null): number => {
  if (cursor === null || !/^\d+$/u.test(cursor)) {
    return 0;
  }

  return Number(cursor);
};

const toReaderPage = (
  lines: readonly ReaderLine[],
  cursor: string | null,
  limit: number
): ReaderPage => {
  const start = toOffset(cursor);
  const end = start + limit;
  let next: string | null = null;

  if (end < lines.length) {
    next = String(end);
  }

  return { items: lines.slice(start, end), next };
};

export { toReaderLines, toReaderPage };

export type { ReaderLine, ReaderLineStates, ReaderNodeInput, ReaderPage };
