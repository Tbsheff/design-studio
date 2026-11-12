const COLUMN_TABS = [
  "layers",
  "pages",
  "assets",
  "versions",
  "tokens",
  "components",
  "system",
] as const;

type ColumnTab = (typeof COLUMN_TABS)[number];

type PanelTab = "chat" | "design" | "comments" | ColumnTab;

interface EditorColumn {
  readonly isOpen: boolean;
  readonly tab: ColumnTab;
}

const DEFAULT_COLUMN: EditorColumn = { isOpen: false, tab: "layers" };

const isColumnTab = (value: string | null | undefined): value is ColumnTab =>
  COLUMN_TABS.some((tab) => tab === value);

const toEditorColumn = (stored: Partial<EditorColumn> | null): EditorColumn => {
  if (!stored || !isColumnTab(stored.tab)) {
    return DEFAULT_COLUMN;
  }

  return { isOpen: stored.isOpen === true, tab: stored.tab };
};

export { COLUMN_TABS, DEFAULT_COLUMN, isColumnTab, toEditorColumn };

export type { ColumnTab, EditorColumn, PanelTab };
