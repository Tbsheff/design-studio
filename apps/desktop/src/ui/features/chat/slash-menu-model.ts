import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent, ReactNode } from "react";

interface SlashChoice {
  id: string;
  label: string;
  icon: IconName;
  hint?: string | undefined;
  meta?: string | null | undefined;
  tag?: ReactNode;
  tip?: string | undefined;
  checked?: boolean;
  disabledReason?: string | null | undefined;
  pick: () => void;
}

interface SlashGroup {
  id: string;
  label: string;
  icon: IconName;
  value: string;
  choices: SlashChoice[];
}

interface SlashSection {
  label: string;
  items: SlashChoice[];
  status?: string | null;
}

interface Options {
  draft: string;
  setDraft: (value: string) => void;
  groups: readonly SlashGroup[];
  sections?: (query: string) => SlashSection[];
  note?: ReactNode;
  label: string;
}

type Row =
  | { key: string; kind: "group"; group: SlashGroup }
  | { key: string; kind: "choice"; choice: SlashChoice; section: string };

const SLASH_QUERY = /^\/(?<query>\S*)$/u;

const wordsStart = (text: string, query: string): boolean => {
  const needle = query.toLowerCase();

  return text
    .toLowerCase()
    .split(/[\s/-]+/u)
    .some((word) => word.startsWith(needle));
};

const startIndex = (
  rows: readonly Row[],
  inGroup: boolean,
  filter: string
): number | null => {
  if (filter !== "") {
    return 0;
  }

  if (!inGroup) {
    return null;
  }

  return Math.max(
    0,
    rows.findIndex((row) => row.kind === "choice" && row.choice.checked)
  );
};

type MenuKey = "move" | "pick" | "drill" | "back" | "escape" | null;

const lockReason = (group: SlashGroup | null | undefined): string | null =>
  group?.choices.find((choice) => choice.disabledReason)?.disabledReason ??
  null;

const MAX_HEIGHT = 288;

const GAP = 6;

const sectionRows = (sections: readonly SlashSection[]): Row[] =>
  sections.flatMap((section) =>
    section.items.map((choice): Row => ({
      choice,
      key: `${section.label}-${choice.id}`,
      kind: "choice",
      section: section.label,
    }))
  );

type ListInputProps = Readonly<Record<string, string | undefined>>;

interface SlashMenuView {
  readonly current: Row | undefined;
  readonly heading: string | null;
  readonly label: string;
  readonly listId: string;
  readonly lock: string | null;
  readonly note: ReactNode;
  readonly onHover: (row: Row) => void;
  readonly onPick: (row: Row | undefined) => void;
  readonly optionId: (row: Row) => string;
  readonly query: string;
  readonly rows: Row[];
  readonly statuses: SlashSection[];
}

interface SlashMenuResult {
  readonly close: () => void;
  readonly inputProps: ListInputProps;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
  readonly open: boolean;
  readonly openMenu: () => void;
  readonly view: SlashMenuView;
}

export {
  GAP,
  MAX_HEIGHT,
  SLASH_QUERY,
  lockReason,
  sectionRows,
  startIndex,
  wordsStart,
};

export type {
  ListInputProps,
  MenuKey,
  Options,
  Row,
  SlashChoice,
  SlashGroup,
  SlashMenuResult,
  SlashMenuView,
  SlashSection,
};
