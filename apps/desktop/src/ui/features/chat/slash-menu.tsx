import { Icon } from "@design-studio/ui";
import { useEffect, useRef, useId, useLayoutEffect, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import { copy } from "./copy.js";
import {
  GAP,
  MAX_HEIGHT,
  SLASH_QUERY,
  lockReason,
  sectionRows,
  startIndex,
  wordsStart,
} from "./slash-menu-model.js";
import type {
  MenuKey,
  Options,
  Row,
  SlashGroup,
  SlashSection,
} from "./slash-menu-model.js";

const choiceRows = (group: SlashGroup, filter: string): Row[] =>
  group.choices
    .filter((choice) => filter === "" || wordsStart(choice.label, filter))
    .map((choice): Row => ({
      choice,
      key: `${group.id}-${choice.id}`,
      kind: "choice",
      section: group.label,
    }));

const stepIndex = (
  index: number | null,
  down: boolean,
  count: number
): number => {
  const last = count - 1;

  if (index === null) {
    if (down) {
      return 0;
    }

    return last;
  }

  return Math.max(0, Math.min(last, index + (down ? 1 : -1)));
};

const menuKey = (
  event: KeyboardEvent<HTMLElement>,
  state: { current: Row | undefined; inGroup: boolean; filter: string }
): MenuKey => {
  const { key } = event;

  if (key === "ArrowDown" || key === "ArrowUp") {
    return "move";
  }

  if (
    (key === "Enter" || key === "Tab") &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey
  ) {
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
  const match = dismissed === draft ? null : SLASH_QUERY.exec(draft);

  if (match) {
    return match[1] ?? "";
  }

  return null;
};

const listInputProps = (
  open: boolean,
  listId: string,
  activeId: string | null
) => {
  if (open) {
    return {
      "aria-activedescendant": activeId ?? undefined,
      "aria-autocomplete": "list" as const,
      "aria-controls": listId,
    };
  }

  return {};
};

const useSlashMenu = ({
  draft,
  setDraft,
  groups,
  sections,
  note,
  label,
}: Options) => {
  const listId = useId();
  const [path, setPath] = useState<string | null>(null);

  const [active, setActive] = useState<{ at: number; key: string } | null>(
    null
  );

  const [dismissed, setDismissed] = useState<string | null>(null);
  const [stash, setStash] = useState<string | null>(null);
  const query = slashQuery(draft, dismissed);
  const open = query !== null;

  const group =
    path === null ? undefined : groups.find((item) => item.id === path);

  const filter = query ?? "";
  let shownSections: SlashSection[] = [];

  if (open && !group && sections) {
    shownSections = sections(filter);
  }

  const rows: Row[] = group
    ? choiceRows(group, filter)
    : [...groupRows(groups, filter), ...sectionRows(shownSections)];

  const frame = `${path ?? ""}|${filter}`;

  const index =
    active && active.key === frame
      ? active.at
      : startIndex(rows, Boolean(group), filter);

  const current =
    index === null ? undefined : rows[Math.min(index, rows.length - 1)];

  useEffect(() => {
    if (dismissed !== null && dismissed !== draft) {
      setDismissed(null);
    }
  }, [draft]);

  useEffect(() => {
    if (open) {
      return;
    }

    setActive(null);

    if (path !== null) {
      setPath(null);
    }

    if (stash === null) {
      return;
    }

    setStash(null);
    const rest = draft.replace(SLASH_QUERY, "");
    setDraft(rest === "" ? stash : `${stash} ${rest}`);
  }, [open]);

  const setIndex = (at: number): void => setActive({ at, key: frame });

  const enter = (id: string | null): void => {
    const from = groups.findIndex((item) => item.id === path);
    setPath(id);
    setActive(id === null && from !== -1 ? { at: from, key: "|" } : null);
    setDismissed(null);
    setDraft("/");
  };

  const finish = (): void => {
    setPath(null);
    setDraft("");
  };

  const activate = (row: Row | undefined): void => {
    if (!row) {
      return;
    }

    if (row.kind === "group") {
      return enter(row.group.id);
    }

    if (row.choice.disabledReason) {
      return;
    }

    row.choice.pick();
    finish();
  };

  const close = (): void => {
    if (open) {
      setDismissed(draft);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (!open || event.nativeEvent.isComposing) {
      return false;
    }

    const action = menuKey(event, { current, filter, inGroup: path !== null });

    if (action === null) {
      return false;
    }

    if (action === "move" && rows.length > 0) {
      setIndex(stepIndex(index, event.key === "ArrowDown", rows.length));
    }

    if (action === "pick") {
      activate(current);
    }

    if (action === "drill" && current?.kind === "group") {
      enter(current.group.id);
    }

    if (action === "back" || (action === "escape" && path !== null)) {
      enter(null);
    }

    if (action === "escape" && path === null) {
      close();
    }

    event.preventDefault();
    event.stopPropagation();

    return true;
  };

  const openMenu = (): void => {
    if (open) {
      return;
    }

    setDismissed(null);
    setPath(null);
    setStash(draft === "" ? null : draft);
    setDraft("/");
  };

  const optionId = (row: Row): string => `${listId}-${row.key}`;

  const view = {
    current,
    heading: group?.label ?? null,
    label: group?.label ?? label,
    listId,
    lock: lockReason(group),
    note: group || filter !== "" ? null : note,
    onHover: (row: Row): void => setIndex(rows.indexOf(row)),
    onPick: activate,
    optionId,
    query: filter,
    rows,
    statuses: shownSections.filter(
      (section) => section.status && section.items.length === 0
    ),
  };

  const inputProps = listInputProps(
    open,
    listId,
    current ? optionId(current) : null
  );

  return { close, inputProps, onKeyDown, open, openMenu, view };
};

type SlashMenuView = ReturnType<typeof useSlashMenu>["view"];

const RowBody = ({ row }: { row: Row }): ReactElement => {
  if (row.kind === "group") {
    return (
      <>
        <Icon name={row.group.icon} size={16} />
        <span className="slash-label">{row.group.label}</span>
        <span className="slash-hint">{row.group.value}</span>
        <span className="slash-end slash-chevron" aria-hidden="true">
          {copy.text11}
        </span>
      </>
    );
  }

  const { choice } = row;

  return (
    <>
      {choice.checked !== undefined && (
        <span className="slash-check-slot">
          {choice.checked && <Icon name="check" size={14} />}
        </span>
      )}
      <Icon name={choice.icon} size={16} />
      <span className="slash-label">{choice.label}</span>
      {choice.hint && <span className="slash-hint">{choice.hint}</span>}
      {choice.tag}
      {choice.meta && (
        <span className="slash-end">
          <span className="slash-meta">{choice.meta}</span>
        </span>
      )}
    </>
  );
};

const usePlacement = (anchor: () => HTMLElement | null): CSSProperties => {
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const place = (): void => {
      const card = anchor()?.getBoundingClientRect();

      if (!card) {
        return;
      }

      const above = card.top - GAP;
      const below = window.innerHeight - card.bottom - GAP;
      const up = above >= MAX_HEIGHT || above >= below;
      const room = Math.max(96, Math.min(MAX_HEIGHT, (up ? above : below) - 8));
      setStyle({
        left: card.left,
        maxHeight: room,
        position: "fixed",
        width: card.width,
        ...(up
          ? { bottom: window.innerHeight - card.top + GAP }
          : { top: card.bottom + GAP }),
      });
    };

    place();
    const observer = new ResizeObserver(place);
    const card = anchor();

    if (card) {
      observer.observe(card);
    }

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return (): void => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, []);

  return style;
};

const useDismissOutside = (
  input: () => HTMLElement | null,
  menu: RefObject<HTMLDivElement | null>,
  onClose: () => void
): void => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const inputRef = useRef(input);
  inputRef.current = input;
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (
        !inputRef.current()?.contains(target) &&
        !menu.current?.contains(target)
      ) {
        closeRef.current();
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [menu]);
};

const SlashMenu = ({
  view,
  anchor,
  input,
  onClose,
}: {
  view: SlashMenuView;
  anchor: () => HTMLElement | null;
  input: () => HTMLElement | null;
  onClose: () => void;
}): ReactNode => {
  const menu = useRef<HTMLDivElement>(null);
  const style = usePlacement(anchor);
  useDismissOutside(input, menu, onClose);
  let currentId: string | null = null;

  if (view.current) {
    currentId = view.optionId(view.current);
  }

  useEffect(() => {
    if (currentId) {
      document
        .querySelector(`#${currentId}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [currentId]);

  return createPortal(
    <div
      ref={menu}
      className="slash-menu"
      style={style}
      data-testid="slash-menu"
      onMouseDown={(event) => event.preventDefault()}
    >
      {view.heading && (
        <div className="slash-heading" aria-hidden="true">
          {view.heading}
          {view.lock && (
            <span className="slash-lock">
              {copy.text}
              {view.lock}
            </span>
          )}
        </div>
      )}
      <div
        tabIndex={0}
        role="listbox"
        id={view.listId}
        aria-label={view.label}
        className="slash-list"
        onMouseMove={(event) => {
          if (event.movementX === 0 && event.movementY === 0) {
            return;
          }

          const id = (event.target as HTMLElement).closest(
            '[role="option"]'
          )?.id;

          const row = view.rows.find((item) => view.optionId(item) === id);

          if (row && row !== view.current) {
            view.onHover(row);
          }
        }}
      >
        {view.rows.map((row, at) => {
          const before = view.rows[at - 1];

          let label: string | null = null;

          if (
            row.kind === "choice" &&
            !view.heading &&
            (before?.kind !== "choice" || before.section !== row.section)
          ) {
            label = row.section;
          }

          const off =
            row.kind === "choice" && Boolean(row.choice.disabledReason);

          return (
            <div key={row.key} role="presentation" className="slash-item">
              {label && (
                <div
                  className="slash-heading"
                  role="presentation"
                  aria-hidden="true"
                >
                  {label}
                </div>
              )}
              <div
                tabIndex={0}
                id={view.optionId(row)}
                role="option"
                aria-selected={row === view.current}
                aria-checked={
                  row.kind === "choice" && row.choice.checked !== undefined
                    ? row.choice.checked
                    : undefined
                }
                aria-disabled={off || undefined}
                aria-description={
                  off && row.kind === "choice"
                    ? (row.choice.disabledReason ?? undefined)
                    : undefined
                }
                aria-label={
                  row.kind === "group"
                    ? `${row.group.label}: ${row.group.value}`
                    : undefined
                }
                className="slash-row"
                data-highlighted={row === view.current || undefined}
                data-tip={row.kind === "choice" ? row.choice.tip : null}
                data-tip-side="top"
                onClick={() => view.onPick(row)}
              >
                <RowBody row={row} />
              </div>
            </div>
          );
        })}
      </div>
      {view.statuses.map((section) => (
        <div key={section.label} className="slash-status">
          <div className="slash-heading">{section.label}</div>
          <div className="slash-empty">{section.status}</div>
        </div>
      ))}
      {view.rows.length === 0 && view.statuses.length === 0 && (
        <div className="slash-empty">
          {copy.noResultsFor}
          {view.query}
        </div>
      )}
      {view.note && <div className="slash-note">{view.note}</div>}
    </div>,
    document.body
  );
};

const groupRows = (groups: readonly SlashGroup[], query: string): Row[] => {
  const heads = groups
    .filter((group) => query === "" || wordsStart(group.label, query))
    .map((group): Row => ({ group, key: `group-${group.id}`, kind: "group" }));

  if (query === "") {
    return heads;
  }

  const leaves = groups.flatMap((group) =>
    group.choices
      .filter((choice) => wordsStart(choice.label, query))
      .map((choice): Row => ({
        choice,
        key: `${group.id}-${choice.id}`,
        kind: "choice",
        section: group.label,
      }))
  );

  return [...heads, ...leaves];
};

export { SlashMenu, useSlashMenu };

export type { SlashGroup, SlashMenuView, SlashSection };
