import { useId } from "react";
import type { KeyboardEvent } from "react";

import {
  choiceRows,
  groupRows,
  listInputProps,
  lockReason,
  menuKey,
  sectionRows,
  startIndex,
  stepIndex,
} from "./slash-menu-model.js";
import type {
  MenuKey,
  Options,
  Row,
  SlashGroup,
  SlashMenuResult,
  SlashMenuView,
  SlashSection,
} from "./slash-menu-model.js";
import { useSlashRestore, useSlashState } from "./use-slash-state.js";
import type { ActiveRow, SlashState } from "./use-slash-state.js";

const toShownSections = (
  open: boolean,
  group: SlashGroup | undefined,
  sections: Options["sections"],
  filter: string
): SlashSection[] => {
  if (open && !group && sections) {
    return sections(filter);
  }

  return [];
};

const toRows = (
  groups: readonly SlashGroup[],
  group: SlashGroup | undefined,
  shown: readonly SlashSection[],
  filter: string
): Row[] => {
  if (group) {
    return choiceRows(group, filter);
  }

  return [...groupRows(groups, filter), ...sectionRows(shown)];
};

const toIndex = (
  active: ActiveRow | null,
  frame: string,
  start: () => number | null
): number | null => {
  if (active && active.key === frame) {
    return active.at;
  }

  return start();
};

const toCurrent = (
  rows: readonly Row[],
  index: number | null
): Row | undefined => {
  if (index === null) {
    return;
  }

  return rows[Math.min(index, rows.length - 1)];
};

const toEnterActive = (from: number, id: string | null): ActiveRow | null => {
  if (id === null && from !== -1) {
    return { at: from, key: "|" };
  }

  return null;
};

const toHeading = (group: SlashGroup | undefined, fallback: string): string =>
  group?.label ?? fallback;

const toNote = (
  group: SlashGroup | undefined,
  filter: string,
  note: Options["note"]
): Options["note"] => {
  if (group || filter !== "") {
    return null;
  }

  return note;
};

const toStash = (draft: string): string | null => {
  if (draft === "") {
    return null;
  }

  return draft;
};

const toOptionAnchor = (
  current: Row | undefined,
  optionId: (row: Row) => string
): string | null => {
  if (current) {
    return optionId(current);
  }

  return null;
};

interface SlashActions {
  readonly activate: (row: Row | undefined) => void;
  readonly close: () => void;
  readonly enter: (id: string | null) => void;
  readonly openMenu: () => void;
}

const useSlashActions = (options: Options, state: SlashState): SlashActions => {
  const { draft, setDraft, groups } = options;
  const { open, path, setActive, setDismissed, setPath, setStash } = state;

  const enter = (id: string | null): void => {
    const from = groups.findIndex((item) => item.id === path);
    setPath(id);
    setActive(toEnterActive(from, id));
    setDismissed(null);
    setDraft("/");
  };

  const activate = (row: Row | undefined): void => {
    if (!row) {
      return;
    }

    if (row.kind === "group") {
      enter(row.group.id);

      return;
    }

    if (!row.choice.disabledReason) {
      row.choice.pick();
      setPath(null);
      setDraft("");
    }
  };

  const close = (): void => {
    if (open) {
      setDismissed(draft);
    }
  };

  const openMenu = (): void => {
    if (open) {
      return;
    }

    setDismissed(null);
    setPath(null);
    setStash(toStash(draft));
    setDraft("/");
  };

  return { activate, close, enter, openMenu };
};

interface KeyContext {
  readonly actions: SlashActions;
  readonly current: Row | undefined;
  readonly index: number | null;
  readonly path: string | null;
  readonly rows: readonly Row[];
  readonly setIndex: (at: number) => void;
}

const runMenuAction = (
  action: MenuKey,
  event: KeyboardEvent<HTMLElement>,
  context: KeyContext
): void => {
  const { actions, current, path } = context;

  if (action === "move" && context.rows.length > 0) {
    context.setIndex(
      stepIndex(context.index, event.key === "ArrowDown", context.rows.length)
    );
  }

  if (action === "pick") {
    actions.activate(current);
  }

  if (action === "drill" && current?.kind === "group") {
    actions.enter(current.group.id);
  }

  if (action === "back" || (action === "escape" && path !== null)) {
    actions.enter(null);
  }

  if (action === "escape" && path === null) {
    actions.close();
  }
};

interface ViewSource {
  readonly actions: SlashActions;
  readonly baseId: string;
  readonly current: Row | undefined;
  readonly filter: string;
  readonly group: SlashGroup | undefined;
  readonly label: string;
  readonly note: Options["note"];
  readonly optionId: (row: Row) => string;
  readonly rows: Row[];
  readonly setIndex: (at: number) => void;
  readonly shown: readonly SlashSection[];
}

const toView = (source: ViewSource): SlashMenuView => ({
  current: source.current,
  heading: source.group?.label ?? null,
  label: toHeading(source.group, source.label),
  listId: source.baseId,
  lock: lockReason(source.group),
  note: toNote(source.group, source.filter, source.note),
  onHover: (row: Row): void => source.setIndex(source.rows.indexOf(row)),
  onPick: source.actions.activate,
  optionId: source.optionId,
  query: source.filter,
  rows: source.rows,
  statuses: source.shown.filter(
    (section) => section.status && section.items.length === 0
  ),
});

const useSlashMenu = (options: Options): SlashMenuResult => {
  const { draft, groups, sections, note, label } = options;
  const baseId = useId();
  const state = useSlashState(draft);
  useSlashRestore(state, draft, options.setDraft);
  const { active, open, path, query, setActive } = state;
  const group = groups.find((item) => path !== null && item.id === path);
  const filter = query ?? "";
  const shown = toShownSections(open, group, sections, filter);
  const rows = toRows(groups, group, shown, filter);
  const frame = `${path ?? ""}|${filter}`;

  const index = toIndex(active, frame, () =>
    startIndex(rows, Boolean(group), filter)
  );

  const current = toCurrent(rows, index);
  const actions = useSlashActions(options, state);
  const setIndex = (at: number): void => setActive({ at, key: frame });
  const optionId = (row: Row): string => `${baseId}-${row.key}`;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (!open || event.nativeEvent.isComposing) {
      return false;
    }

    const action = menuKey(event, { current, filter, inGroup: path !== null });

    if (action === null) {
      return false;
    }

    runMenuAction(action, event, {
      actions,
      current,
      index,
      path,
      rows,
      setIndex,
    });
    event.preventDefault();
    event.stopPropagation();

    return true;
  };

  const { close, openMenu } = actions;

  const inputProps = listInputProps(
    open,
    baseId,
    toOptionAnchor(current, optionId)
  );

  const view = toView({
    actions,
    baseId,
    current,
    filter,
    group,
    label,
    note,
    optionId,
    rows,
    setIndex,
    shown,
  });

  return { close, inputProps, onKeyDown, open, openMenu, view };
};

export { useSlashMenu };
