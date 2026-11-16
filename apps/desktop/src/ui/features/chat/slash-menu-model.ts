import type { IconName } from "@design-studio/ui";
import type { KeyboardEvent, ReactNode } from "react";

import { copy } from "./copy.js";

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

interface ListInputProps {
  readonly "aria-activedescendant"?: string;
  readonly "aria-autocomplete"?: "list";
  readonly "aria-controls"?: string;
}

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

const toChoiceRow = (group: SlashGroup, choice: SlashChoice): Row => ({
  choice,
  key: `${group.id}-${choice.id}`,
  kind: "choice",
  section: group.label,
});

const choiceRows = (group: SlashGroup, filter: string): Row[] => {
  const rows: Row[] = [];

  for (const choice of group.choices) {
    if (filter === "" || wordsStart(choice.label, filter)) {
      rows.push(toChoiceRow(group, choice));
    }
  }

  return rows;
};

const stepIndex = (
  index: number | null,
  isDown: boolean,
  count: number
): number => {
  const last = count - 1;

  if (index === null) {
    if (isDown) {
      return 0;
    }

    return last;
  }

  let delta = -1;

  if (isDown) {
    delta = 1;
  }

  return Math.max(0, Math.min(last, index + delta));
};

const isPlainPickKey = (event: KeyboardEvent<HTMLElement>): boolean => {
  const isPickKey = event.key === "Enter" || event.key === "Tab";

  return isPickKey && !event.metaKey && !event.ctrlKey && !event.shiftKey;
};

const menuKey = (
  event: KeyboardEvent<HTMLElement>,
  state: { current: Row | undefined; inGroup: boolean; filter: string }
): MenuKey => {
  const { key } = event;

  if (key === "ArrowDown" || key === "ArrowUp") {
    return "move";
  }

  if (isPlainPickKey(event)) {
    return "pick";
  }

  if (key === "ArrowRight" && state.current?.kind === "group") {
    return "drill";
  }

  if (
    state.inGroup &&
    (key === "ArrowLeft" || (key === "Backspace" && state.filter === ""))
  ) {
    return "back";
  }

  if (key === "Escape") {
    return "escape";
  }

  return null;
};

const slashQuery = (draft: string, dismissed: string | null): string | null => {
  if (dismissed === draft) {
    return null;
  }

  const match = SLASH_QUERY.exec(draft);

  if (match) {
    return match[1] ?? "";
  }

  return null;
};

const listInputProps = (
  isOpen: boolean,
  listId: string,
  activeId: string | null
): ListInputProps => {
  if (!isOpen) {
    return {};
  }

  if (activeId) {
    return {
      "aria-activedescendant": activeId,
      "aria-autocomplete": "list",
      "aria-controls": listId,
    };
  }

  return { "aria-autocomplete": "list", "aria-controls": listId };
};

const groupRows = (groups: readonly SlashGroup[], query: string): Row[] => {
  const heads: Row[] = [];
  const leaves: Row[] = [];

  for (const group of groups) {
    if (query === "" || wordsStart(group.label, query)) {
      heads.push({ group, key: `group-${group.id}`, kind: "group" });
    }

    if (query !== "") {
      leaves.push(...choiceRows(group, query));
    }
  }

  return [...heads, ...leaves];
};

interface AbsentValue {
  readonly value?: never;
}

const EMPTY_ARIA: AbsentValue = {};
const ABSENT = EMPTY_ARIA.value;

interface OptionAria {
  readonly checked: boolean | undefined;
  readonly description: string | undefined;
  readonly disabled: true | undefined;
  readonly highlighted: true | undefined;
  readonly label: string | undefined;
  readonly tip: string | null;
}

const hasCheckSlot = (choice: SlashChoice): boolean =>
  choice.checked === true || choice.checked === false;

const toChoiceAria = (choice: SlashChoice): OptionAria => {
  const { checked } = choice;
  const highlighted = ABSENT;
  const label = ABSENT;
  const tip = choice.tip ?? null;
  let disabled: true | undefined = ABSENT;
  let description: string | undefined = ABSENT;

  if (choice.disabledReason) {
    disabled = true;
    description = choice.disabledReason;
  }

  return { checked, description, disabled, highlighted, label, tip };
};

const toGroupAria = (group: SlashGroup): OptionAria => {
  const checked = ABSENT;
  const description = ABSENT;
  const disabled = ABSENT;
  const highlighted = ABSENT;
  const label = `${group.label}: ${group.value}`;

  return { checked, description, disabled, highlighted, label, tip: null };
};

const toBaseAria = (row: Row): OptionAria => {
  if (row.kind === "choice") {
    return toChoiceAria(row.choice);
  }

  return toGroupAria(row.group);
};

const toOptionAria = (row: Row, current: Row | undefined): OptionAria => {
  const aria = toBaseAria(row);

  if (row === current) {
    return { ...aria, highlighted: true };
  }

  return aria;
};

const toRowHeading = (
  rows: readonly Row[],
  at: number,
  hasHeading: boolean
): string | null => {
  const row = rows[at];
  const before = rows[at - 1];

  if (row?.kind === "group" && before?.kind === "choice" && !hasHeading) {
    return copy.settingsHeading;
  }

  if (
    row?.kind === "choice" &&
    !hasHeading &&
    (before?.kind !== "choice" || before.section !== row.section)
  ) {
    return row.section;
  }

  return null;
};

export {
  GAP,
  MAX_HEIGHT,
  SLASH_QUERY,
  choiceRows,
  groupRows,
  hasCheckSlot,
  listInputProps,
  lockReason,
  menuKey,
  sectionRows,
  slashQuery,
  startIndex,
  stepIndex,
  toOptionAria,
  toRowHeading,
  wordsStart,
};

export type {
  ListInputProps,
  OptionAria,
  MenuKey,
  Options,
  Row,
  SlashChoice,
  SlashGroup,
  SlashMenuResult,
  SlashMenuView,
  SlashSection,
};
