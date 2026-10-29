import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

export interface SlashChoice {
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

export interface SlashGroup {
  id: string;
  label: string;
  icon: IconName;
  value: string;
  choices: SlashChoice[];
}

export interface SlashSection {
  label: string;
  items: SlashChoice[];
  status?: string | null;
}

type Row = { key: string; kind: 'group'; group: SlashGroup } | { key: string; kind: 'choice'; choice: SlashChoice; section: string };

const SLASH_QUERY = /^\/(\S*)$/;
const MAX_HEIGHT = 288;
const GAP = 6;

function wordsStart(text: string, query: string): boolean {
  const needle = query.toLowerCase();
  return text
    .toLowerCase()
    .split(/[\s/-]+/)
    .some((word) => word.startsWith(needle));
}

function groupRows(groups: readonly SlashGroup[], query: string): Row[] {
  const heads = groups.filter((group) => query === '' || wordsStart(group.label, query)).map((group): Row => ({ key: `group-${group.id}`, kind: 'group', group }));
  if (query === '') return heads;
  const leaves = groups.flatMap((group) => group.choices.filter((choice) => wordsStart(choice.label, query)).map((choice): Row => ({ key: `${group.id}-${choice.id}`, kind: 'choice', choice, section: group.label })));
  return [...heads, ...leaves];
}

function choiceRows(group: SlashGroup, filter: string): Row[] {
  return group.choices.filter((choice) => filter === '' || wordsStart(choice.label, filter)).map((choice): Row => ({ key: `${group.id}-${choice.id}`, kind: 'choice', choice, section: group.label }));
}

function sectionRows(sections: readonly SlashSection[]): Row[] {
  return sections.flatMap((section) => section.items.map((choice): Row => ({ key: `${section.label}-${choice.id}`, kind: 'choice', choice, section: section.label })));
}

function startIndex(rows: readonly Row[], inGroup: boolean, filter: string): number | null {
  if (filter !== '') return 0;
  if (!inGroup) return null;
  return Math.max(0, rows.findIndex((row) => row.kind === 'choice' && row.choice.checked));
}

function stepIndex(index: number | null, down: boolean, count: number): number {
  const last = count - 1;
  if (index === null) return down ? 0 : last;
  return Math.max(0, Math.min(last, index + (down ? 1 : -1)));
}

type MenuKey = 'move' | 'pick' | 'drill' | 'back' | 'escape' | null;

function menuKey(event: KeyboardEvent<HTMLElement>, state: { current: Row | undefined; inGroup: boolean; filter: string }): MenuKey {
  const key = event.key;
  if (key === 'ArrowDown' || key === 'ArrowUp') return 'move';
  if ((key === 'Enter' || key === 'Tab') && !event.metaKey && !event.ctrlKey && !event.shiftKey) return 'pick';
  if (key === 'ArrowRight' && state.current?.kind === 'group') return 'drill';
  if (state.inGroup && (key === 'ArrowLeft' || (key === 'Backspace' && state.filter === ''))) return 'back';
  return key === 'Escape' ? 'escape' : null;
}

function slashQuery(draft: string, dismissed: string | null): string | null {
  const match = dismissed === draft ? null : SLASH_QUERY.exec(draft);
  return match ? (match[1] ?? '') : null;
}

function listInputProps(open: boolean, listId: string, activeId: string | null) {
  return open ? { 'aria-controls': listId, 'aria-autocomplete': 'list' as const, 'aria-activedescendant': activeId ?? undefined } : {};
}

interface Options {
  draft: string;
  setDraft: (value: string) => void;
  groups: readonly SlashGroup[];
  sections?: (query: string) => SlashSection[];
  note?: ReactNode;
  label: string;
}

function lockReason(group: SlashGroup | null | undefined): string | null {
  return group?.choices.find((choice) => choice.disabledReason)?.disabledReason ?? null;
}

export function useSlashMenu({ draft, setDraft, groups, sections, note, label }: Options) {
  const listId = useId();
  const [path, setPath] = useState<string | null>(null);
  const [active, setActive] = useState<{ at: number; key: string } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [stash, setStash] = useState<string | null>(null);
  const query = slashQuery(draft, dismissed);
  const open = query !== null;
  const group = path === null ? undefined : groups.find((item) => item.id === path);
  const filter = query ?? '';
  const shownSections = open && !group && sections ? sections(filter) : [];
  const rows: Row[] = group ? choiceRows(group, filter) : [...groupRows(groups, filter), ...sectionRows(shownSections)];
  const frame = `${path ?? ''}|${filter}`;
  const index = active && active.key === frame ? active.at : startIndex(rows, Boolean(group), filter);
  const current = index === null ? undefined : rows[Math.min(index, rows.length - 1)];

  useEffect(() => {
    if (dismissed !== null && dismissed !== draft) setDismissed(null);
  }, [draft]);

  useEffect(() => {
    if (open) return;
    setActive(null);
    if (path !== null) setPath(null);
    if (stash === null) return;
    setStash(null);
    const rest = draft.replace(SLASH_QUERY, '');
    setDraft(rest === '' ? stash : `${stash} ${rest}`);
  }, [open]);

  const setIndex = (at: number) => setActive({ at, key: frame });
  const enter = (id: string | null) => {
    const from = groups.findIndex((item) => item.id === path);
    setPath(id);
    setActive(id === null && from >= 0 ? { at: from, key: '|' } : null);
    setDismissed(null);
    setDraft('/');
  };
  const finish = () => {
    setPath(null);
    setDraft('');
  };
  const activate = (row: Row | undefined) => {
    if (!row) return;
    if (row.kind === 'group') return enter(row.group.id);
    if (row.choice.disabledReason) return;
    row.choice.pick();
    finish();
  };
  const close = () => {
    if (open) setDismissed(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (!open || event.nativeEvent.isComposing) return false;
    const action = menuKey(event, { current, inGroup: path !== null, filter });
    if (action === null) return false;
    if (action === 'move' && rows.length > 0) setIndex(stepIndex(index, event.key === 'ArrowDown', rows.length));
    if (action === 'pick') activate(current);
    if (action === 'drill' && current?.kind === 'group') enter(current.group.id);
    if (action === 'back' || (action === 'escape' && path !== null)) enter(null);
    if (action === 'escape' && path === null) close();
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const openMenu = () => {
    if (open) return;
    setDismissed(null);
    setPath(null);
    setStash(draft === '' ? null : draft);
    setDraft('/');
  };

  const optionId = (row: Row) => `${listId}-${row.key}`;
  const view = {
    listId,
    rows,
    current,
    query: filter,
    heading: group?.label ?? null,
    lock: lockReason(group),
    label: group?.label ?? label,
    statuses: shownSections.filter((section) => section.status && section.items.length === 0),
    note: group || filter !== '' ? null : note,
    optionId,
    onHover: (row: Row) => setIndex(rows.indexOf(row)),
    onPick: activate,
  };
  const inputProps = listInputProps(open, listId, current ? optionId(current) : null);
  return { open, view, inputProps, onKeyDown, openMenu, close };
}

export type SlashMenuView = ReturnType<typeof useSlashMenu>['view'];

function usePlacement(anchor: () => HTMLElement | null) {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  useLayoutEffect(() => {
    const place = () => {
      const card = anchor()?.getBoundingClientRect();
      if (!card) return;
      const above = card.top - GAP;
      const below = window.innerHeight - card.bottom - GAP;
      const up = above >= MAX_HEIGHT || above >= below;
      const room = Math.max(96, Math.min(MAX_HEIGHT, (up ? above : below) - 8));
      setStyle({ position: 'fixed', left: card.left, width: card.width, maxHeight: room, ...(up ? { bottom: window.innerHeight - card.top + GAP } : { top: card.bottom + GAP }) });
    };
    place();
    const observer = new ResizeObserver(place);
    const card = anchor();
    if (card) observer.observe(card);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, []);
  return style;
}

function useDismissOutside(input: () => HTMLElement | null, menu: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const inputRef = useRef(input);
  inputRef.current = input;
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!inputRef.current()?.contains(target) && !menu.current?.contains(target)) closeRef.current();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);
}

function RowBody({ row }: { row: Row }) {
  if (row.kind === 'group') {
    return (
      <>
        <Icon name={row.group.icon} size={16} />
        <span className="slash-label">{row.group.label}</span>
        <span className="slash-hint">{row.group.value}</span>
        <span className="slash-end slash-chevron" aria-hidden="true">
          ›
        </span>
      </>
    );
  }
  const { choice } = row;
  return (
    <>
      {choice.checked !== undefined && <span className="slash-check-slot">{choice.checked && <Icon name="check" size={14} />}</span>}
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
}

export function SlashMenu({ view, anchor, input, onClose }: { view: SlashMenuView; anchor: () => HTMLElement | null; input: () => HTMLElement | null; onClose: () => void }) {
  const menu = useRef<HTMLDivElement>(null);
  const style = usePlacement(anchor);
  useDismissOutside(input, menu, onClose);
  const currentId = view.current ? view.optionId(view.current) : null;
  useEffect(() => {
    if (currentId) document.getElementById(currentId)?.scrollIntoView({ block: 'nearest' });
  }, [currentId]);
  return createPortal(
    <div ref={menu} className="slash-menu" style={style} data-testid="slash-menu" onMouseDown={(event) => event.preventDefault()}>
      {view.heading && (
        <div className="slash-heading" aria-hidden="true">
          {view.heading}
          {view.lock && <span className="slash-lock"> · {view.lock}</span>}
        </div>
      )}
      <div
        role="listbox"
        id={view.listId}
        aria-label={view.label}
        className="slash-list"
        onMouseMove={(event) => {
          if (event.movementX === 0 && event.movementY === 0) return;
          const id = (event.target as HTMLElement).closest('[role="option"]')?.id;
          const row = view.rows.find((item) => view.optionId(item) === id);
          if (row && row !== view.current) view.onHover(row);
        }}
      >
        {view.rows.map((row, at) => {
          const before = view.rows[at - 1];
          const label = row.kind === 'choice' && !view.heading && (before?.kind !== 'choice' || before.section !== row.section) ? row.section : null;
          const off = row.kind === 'choice' && Boolean(row.choice.disabledReason);
          return (
            <div key={row.key} role="presentation" className="slash-item">
              {label && (
                <div className="slash-heading" role="presentation" aria-hidden="true">
                  {label}
                </div>
              )}
              <div
                id={view.optionId(row)}
                role="option"
                aria-selected={row === view.current}
                aria-checked={row.kind === 'choice' && row.choice.checked !== undefined ? row.choice.checked : undefined}
                aria-disabled={off || undefined}
                aria-description={off && row.kind === 'choice' ? (row.choice.disabledReason ?? undefined) : undefined}
                aria-label={row.kind === 'group' ? `${row.group.label}: ${row.group.value}` : undefined}
                className="slash-row"
                data-highlighted={row === view.current || undefined}
                data-tip={row.kind === 'choice' ? row.choice.tip : undefined}
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
      {view.rows.length === 0 && view.statuses.length === 0 && <div className="slash-empty">No results for /{view.query}</div>}
      {view.note && <div className="slash-note">{view.note}</div>}
    </div>,
    document.body,
  );
}
