import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { RunStatus, SelectionContext } from '../../shared/contracts';
import { cleanFramePath } from '../canvasFrames';
import { usePopover } from '../usePopover';
import { Icon, type IconName } from './Icon';

export interface FrameMenuItem {
  id: string;
  label: string;
  icon: IconName;
  disabled?: string;
  run: () => void;
}

export function FrameMoreMenu({ name, items }: { name: string; items: FrameMenuItem[] }) {
  const menu = useMenu();
  useEffect(() => {
    if (menu.open) menu.root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [menu.open, menu.root]);
  if (items.length === 0) return null;
  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className="frame-chip more"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`More actions for ${name}`}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={menu.open ? undefined : 'More frame actions'}
      >
        <Icon name="more" size={14} />
      </button>
      {menu.open && (
        <div className="ui-menu project-menu canvas-menu frame-menu" role="menu" aria-label={`${name} actions`} onKeyDown={(e) => menuKeys(e, menu.close)}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`ui-menu-item${item.disabled ? ' has-hint' : ''}`}
              tabIndex={-1}
              disabled={Boolean(item.disabled)}
              onClick={() => {
                menu.close(true);
                item.run();
              }}
            >
              <Icon name={item.icon} size={14} />
              <span>{item.label}</span>
              {item.disabled && <span className="ui-menu-hint">{item.disabled}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type ResizeEdge = 'right' | 'bottom' | 'corner';

const EDGES: { edge: ResizeEdge; label: string }[] = [
  { edge: 'right', label: 'Resize width' },
  { edge: 'bottom', label: 'Resize height' },
  { edge: 'corner', label: 'Resize' },
];

export function FrameResizeHandles({ onPointerDown }: { onPointerDown: (e: ReactPointerEvent, edge: ResizeEdge) => void }) {
  return (
    <>
      {EDGES.map(({ edge, label }) => (
        <div key={edge} className={`frame-resize ${edge}`} aria-hidden="true" data-edge={edge} onPointerDown={(e) => onPointerDown(e, edge)} />
      ))}
      <span className="frame-size-readout" aria-hidden="true" />
    </>
  );
}

const MENU_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

function menuKeys(event: ReactKeyboardEvent<HTMLElement>, close: (refocus: boolean) => void) {
  const step = MENU_STEP[event.key];
  if (event.key === 'Tab') close(false);
  if (!step) return;
  event.preventDefault();
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  items[step(Math.max(0, index), items.length)]?.focus();
}

function useMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);
  return { open, setOpen, root, trigger, close };
}

const STATUS_TEXT: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Done',
  canceled: 'Canceled',
  failed: 'Failed',
  budget_exceeded: 'Budget limit',
};

export interface Sibling {
  id: string;
  label: string;
  title: string;
}

export interface FrameVariation {
  label: string;
  title: string;
  status: RunStatus | null;
  costText: string;
  siblings: Sibling[];
  scoped?: boolean;
  error?: string | null;
  keepBlocked?: string | null;
  onKeep: () => void | Promise<void>;
  onMix: (toDirectionId: string, element: SelectionContext) => Promise<void>;
}

const stop = (e: ReactPointerEvent) => e.stopPropagation();

function UseInMenu({ siblings, busy, onPick }: { siblings: Sibling[]; busy: boolean; onPick: (id: string) => void }) {
  const menu = useMenu();
  useEffect(() => {
    if (menu.open) menu.root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [menu.open, menu.root]);
  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className="frame-chip strong"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        disabled={busy}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={menu.open ? undefined : 'Use the selected element in another variation'}
      >
        {busy ? 'Starting…' : 'Use in…'}
        <Icon name="chevronDown" size={12} />
      </button>
      {menu.open && (
        <div className="project-menu canvas-menu frame-menu" role="menu" aria-label="Use in variation" onKeyDown={(e) => menuKeys(e, menu.close)}>
          {siblings.map((other) => (
            <button
              key={other.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                menu.close(true);
                onPick(other.id);
              }}
            >
              <span className="badge">{other.label}</span>
              <span>{other.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function shortRejection(error: string): string {
  if (!error.startsWith('Rejected:')) return error.length > 60 ? `${error.slice(0, 60)}…` : error;
  return /another file|other files/.test(error) ? 'Rejected: changed another file' : 'Rejected: changed code outside the element';
}

export function VariationControls({ variation, active, element, onMixed }: { variation: FrameVariation; active: boolean; element: SelectionContext | null; onMixed: () => void }) {
  const [mixing, setMixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keeping, setKeeping] = useState(false);
  const status = variation.status;
  const keep = async () => {
    if (variation.keepBlocked || keeping) return;
    setKeeping(true);
    setError(null);
    try {
      await variation.onKeep();
    } catch (err) {
      setError(`Could not keep it. ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setKeeping(false);
    }
  };
  const mix = async (to: string) => {
    if (!element) return;
    setMixing(true);
    setError(null);
    try {
      await variation.onMix(to, element);
      onMixed();
    } catch (err) {
      setError(`Could not use the element. ${err instanceof Error ? err.message : String(err)} Pick it again, then try again.`);
    } finally {
      setMixing(false);
    }
  };
  return (
    <>
      {!variation.error && (
        <span className={`variation-status ${status ?? 'idle'}`} data-testid="variation-status" data-tip={variation.costText}>
          {status ? STATUS_TEXT[status] : 'No run'}
        </span>
      )}
      {active && element && !variation.scoped && variation.siblings.length > 0 && <UseInMenu siblings={variation.siblings} busy={mixing} onPick={(id) => void mix(id)} />}
      <button
        type="button"
        className="frame-chip keep"
        aria-disabled={variation.keepBlocked ? true : undefined}
        data-tip={variation.keepBlocked ?? (variation.scoped ? 'Put this version of the element into the design' : undefined)}
        data-testid="variation-keep"
        onPointerDown={stop}
        onClick={() => void keep()}
      >
        {keeping ? 'Keeping…' : 'Keep this one'}
      </button>
      {variation.error && (
        <span className="frame-error scope" role="status" aria-label={variation.error} data-testid="variation-error" data-tip={variation.error}>
          {shortRejection(variation.error)}
        </span>
      )}
      {error && (
        <span className="frame-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export function FramePageMenu({ path, listPages, onPath }: { path: string; listPages: (() => Promise<string[]>) | null; onPath: (path: string) => void }) {
  const menu = useMenu();
  const [draft, setDraft] = useState(path);
  const [pages, setPages] = useState<string[] | null>(null);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const loader = useRef(listPages);
  loader.current = listPages;
  const hasPages = listPages !== null;
  useEffect(() => {
    if (!menu.open) return;
    setDraft(path);
    setInvalid(false);
    input.current?.focus();
    input.current?.select();
    const load = loader.current;
    if (!load) return;
    let alive = true;
    load()
      .then((list) => alive && setPages(list))
      .catch(() => alive && setPages([]));
    return () => {
      alive = false;
    };
  }, [menu.open, path, hasPages]);
  const apply = (raw: string) => {
    const clean = cleanFramePath(raw);
    if (clean === null) {
      setInvalid(true);
      return;
    }
    onPath(clean);
    menu.close(true);
  };
  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className={`frame-chip page${path ? ' set' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={`Page: ${path || 'home'}`}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={menu.open ? undefined : 'Show another page in this frame'}
      >
        <Icon name="file" size={12} />
        <span className="frame-path">/{path}</span>
      </button>
      {menu.open && (
        <div className="project-menu canvas-menu frame-menu frame-page-menu" role="dialog" aria-label="Frame page">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply(draft);
            }}
          >
            <label className="frame-page-field">
              <span>Path</span>
              <input
                ref={input}
                value={draft}
                spellCheck={false}
                aria-invalid={invalid}
                placeholder={listPages ? 'about.html' : 'pricing'}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setInvalid(false);
                }}
              />
            </label>
            {invalid && <p className="frame-page-hint error">Use a path inside the project, like about.html. No “..”.</p>}
          </form>
          {listPages && (
            <div role="menu" aria-label="Pages" onKeyDown={(e) => menuKeys(e, menu.close)}>
              {pages === null && <p className="frame-page-hint">Loading pages…</p>}
              {pages?.length === 0 && <p className="frame-page-hint">No other pages yet.</p>}
              {pages?.map((page) => (
                <button key={page} type="button" role="menuitem" aria-current={page === (path || 'index.html') ? 'true' : undefined} onClick={() => apply(page === 'index.html' ? '' : page)}>
                  <Icon name="file" size={14} />
                  <span>{page}</span>
                  {page === (path || 'index.html') && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
