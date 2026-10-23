import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Direction, Project, ProjectKind, RunStatus, SelectionContext } from '../../shared/contracts';
import { api, errorText } from '../api';
import { HTML_FRAME_SANDBOX } from '../bridge';
import type { RunMap } from '../runState';
import { useUi, type Viewport } from '../storage';
import type { BuildError, FilesChange } from '../useStudioData';
import { usePreviewFrames } from '../usePreviewFrames';
import { budgetFor, money } from '../useVariations';
import { groupOf } from '../variationsApi';
import { useSwapGate } from '../useSwapGate';
import { usePopover } from '../usePopover';
import { Icon } from './Icon';

const MIN_PANE = 280;
const GAP = 16;

interface PaneRun {
  status: RunStatus | null;
  costUsd: number;
  running: boolean;
}

function paneRun(runs: RunMap, directionId: string): PaneRun {
  const list = Object.values(runs)
    .filter((run) => run.directionId === directionId)
    .sort((a, b) => a.startedAt - b.startedAt);
  const latest = list[list.length - 1];
  const costUsd = list.reduce((sum, run) => sum + (run.summary?.costUsd ?? 0), 0);
  return { status: latest?.status ?? null, costUsd, running: list.some((run) => run.status === 'running') };
}

const STATUS_TEXT: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Done',
  canceled: 'Canceled',
  failed: 'Failed',
  budget_exceeded: 'Budget limit',
};

function gridColumns(width: number, count: number): number {
  return Math.max(1, Math.min(count, Math.floor((width + GAP) / (MIN_PANE + GAP))));
}

interface PaneProps {
  projectId: string;
  direction: Direction;
  kind: ProjectKind;
  viewport: Viewport;
  scale: number;
  change: FilesChange | null;
  run: PaneRun;
  current: boolean;
  selecting: boolean;
  onToggleSelect: () => void;
  others: Direction[];
  onSwapDone: (directionId: string) => void;
  onOpen: () => void;
  onKeep: () => void;
  onMix: (to: Direction, element: SelectionContext) => Promise<void>;
  onError: (e: Omit<BuildError, 'id' | 'ts'>) => void;
}

function labelOf(direction: Direction): string {
  return direction.variation?.label ?? direction.name.slice(0, 1);
}

const MENU_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

function UseInMenu({ others, busy, onPick }: { others: Direction[]; busy: boolean; onPick: (to: Direction) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const onMenuKey = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const step = MENU_STEP[event.key];
    if (event.key === 'Tab') close(false);
    if (!step) return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    items[step(Math.max(0, index), items.length)]?.focus();
  };

  return (
    <div className="variation-mix-menu" ref={root}>
      <button ref={trigger} className="btn small has-icon" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy || others.length === 0}>
        {busy ? 'Starting…' : 'Use in…'}
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <ul ref={list} className="variation-menu" role="menu" aria-label="Use in variation" onKeyDown={onMenuKey}>
          {others.map((other) => (
            <li key={other.id} role="none">
              <button
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(true);
                  onPick(other);
                }}
              >
                <span className="badge">{labelOf(other)}</span> {other.variation?.title ?? other.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VariationPane(props: PaneProps) {
  const { projectId, direction, kind, viewport, scale } = props;
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selection, setSelectionState] = useState<SelectionContext[]>([]);
  const [mixError, setMixError] = useState<string | null>(null);
  const [mixing, setMixing] = useState(false);
  const setSelection = useCallback((updater: (prev: SelectionContext[]) => SelectionContext[]) => setSelectionState((prev) => updater(prev).slice(-1)), []);

  useEffect(() => {
    let alive = true;
    api
      .directionPreview(projectId, direction.id)
      .then(({ url }) => alive && setBaseUrl(url))
      .catch((err) => alive && setUrlError(`Could not load this preview. ${errorText(err)} Reload the page to try again.`));
    return () => {
      alive = false;
    };
  }, [projectId, direction.id]);

  const frames = usePreviewFrames({
    projectId,
    directionId: direction.id,
    kind,
    baseUrl,
    live: true,
    lastChange: props.change,
    selectMode: props.selecting,
    selection,
    setSelection,
    onError: props.onError,
    onModeExited: () => props.selecting && props.onToggleSelect(),
    onFrameWheel: () => undefined,
    onZoomKey: () => undefined,
  });

  const { onSwapDone } = props;
  const slotCount = frames.slots.length;
  const hadBack = useRef(false);
  useEffect(() => {
    if (slotCount > 1) hadBack.current = true;
    else if (hadBack.current) {
      hadBack.current = false;
      onSwapDone(direction.id);
    }
  }, [slotCount, direction.id, onSwapDone]);

  const label = labelOf(direction);
  const variation = direction.variation;
  const picked = selection[0] ?? null;
  const stroke = 1 / scale;

  const mixInto = async (to: Direction) => {
    if (!picked) return;
    setMixing(true);
    setMixError(null);
    try {
      await props.onMix(to, picked);
      setSelectionState([]);
      frames.clearSelection();
    } catch (err) {
      setMixError(`Could not use the element. ${errorText(err)} Pick it again, then try again.`);
    } finally {
      setMixing(false);
    }
  };

  return (
    <section className={`variation-pane ${props.current ? 'current' : ''} ${props.selecting ? 'selecting' : ''}`} aria-label={`Variation ${label}`} data-direction-id={direction.id} data-testid="variation-pane">
      <header className="variation-pane-head">
        <button className="variation-pane-title" onClick={props.onOpen} title={`Open ${direction.name} on the canvas`}>
          <span className="badge accent">{label}</span>
          <span className="truncate">{variation?.title ?? direction.name}</span>
        </button>
        <span className={`variation-status ${props.run.status ?? 'idle'}`} data-testid="variation-status">
          {props.run.status ? STATUS_TEXT[props.run.status] : 'No run'}
        </span>
        <span className="variation-cost" data-testid="variation-cost">
          {money(props.run.costUsd)}
        </span>
      </header>
      {variation && (
        <p className="variation-pane-brief" title={variation.brief}>
          {variation.brief}
        </p>
      )}
      <div className="variation-stage" style={{ height: viewport.height * scale }}>
        {urlError && <div className="stage-message">{urlError}</div>}
        <div className="variation-board" style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})` }}>
          {frames.slots.map((slot) => (
            <iframe
              key={slot.token}
              ref={(el) => {
                frames.elements.current[slot.token] = el;
              }}
              title={`Variation ${label} preview`}
              className={`variation-frame ${slot.token === frames.frontToken ? 'front' : 'back'}`}
              src={slot.src}
              onLoad={() => frames.onFrameLoad(slot.token)}
              sandbox={kind === 'html' ? HTML_FRAME_SANDBOX : undefined}
              width={viewport.width}
              height={viewport.height}
            />
          ))}
          <div className="overlay" style={{ ['--stroke' as string]: `${stroke}px` }}>
            {props.selecting && frames.hover && (
              <div className="box hover" style={{ left: frames.hover.rect.x, top: frames.hover.rect.y, width: frames.hover.rect.width, height: frames.hover.rect.height }} />
            )}
            {selection.map((s) => (
              <div key={s.selector} className="box selected" style={{ left: s.rect.x, top: s.rect.y, width: s.rect.width, height: s.rect.height }} />
            ))}
          </div>
        </div>
        {props.run.running && <span className="variation-live" aria-hidden="true" />}
      </div>
      <footer className="variation-pane-foot">
        {picked ? (
          <div className="variation-mix">
            <span className="variation-picked truncate" title={picked.selector}>
              &lt;{picked.tag}&gt; {picked.text.slice(0, 40)}
            </span>
            <UseInMenu others={props.others} busy={mixing} onPick={(to) => void mixInto(to)} />
            <button
              className="icon-btn small"
              aria-label="Clear selection"
              onClick={() => {
                setSelectionState([]);
                frames.clearSelection();
              }}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ) : (
          <button className={`btn small has-icon ${props.selecting ? 'active' : ''}`} aria-pressed={props.selecting} onClick={props.onToggleSelect} data-tip="Pick an element to use in another variation">
            <Icon name="pointer" size={14} />
            {props.selecting ? 'Pick an element' : 'Select'}
          </button>
        )}
        <div className="spacer" />
        <button className="btn small" onClick={props.onOpen}>
          Open
        </button>
        <button className="btn small" onClick={props.onKeep}>
          Keep this one
        </button>
      </footer>
      {mixError && (
        <p className="alert error variation-pane-error" role="alert">
          {mixError}
        </p>
      )}
    </section>
  );
}

interface GridProps {
  project: Project;
  groupId: string;
  runs: RunMap;
  lastChange: FilesChange | null;
  currentDirectionId: string | null;
  notice: string | null;
  onClearNotice: () => void;
  onOpen: (directionId: string) => void;
  onKeep: (directionId: string) => void;
  onClose: () => void;
  onCancelAll: () => Promise<void>;
  onMix: (fromDirectionId: string, toDirectionId: string, element: SelectionContext) => Promise<void>;
  onError: (e: Omit<BuildError, 'id' | 'ts'>) => void;
}

export function VariationsGrid(props: GridProps) {
  const { project, groupId } = props;
  const { viewport } = useUi();
  const directions = useMemo(() => groupOf(project, groupId), [project, groupId]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const gate = useSwapGate(project.kind, directions, props.lastChange);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const count = directions.length;
  const columns = gridColumns(width, Math.max(1, count));
  const paneWidth = columns > 0 ? (width - GAP * (columns - 1)) / columns : 0;
  const scale = Math.max(0.05, Math.min(1, paneWidth / viewport.width));
  const paneRuns = directions.map((direction) => paneRun(props.runs, direction.id));
  const totalCost = paneRuns.reduce((sum, run) => sum + run.costUsd, 0);
  const anyRunning = paneRuns.some((run) => run.running);
  const firstRun = Object.values(props.runs).find((run) => run.request?.variation && directions.some((direction) => direction.id === run.directionId));
  const budget = budgetFor(project, firstRun?.request?.level ?? project.settings.defaultLevel, count);
  const prompt = directions[0]?.variation?.prompt ?? '';

  const cancelAll = async () => {
    setCancelError(null);
    try {
      await props.onCancelAll();
    } catch (err) {
      setCancelError(`Could not cancel the runs. ${errorText(err)} Try again.`);
    }
  };

  return (
    <div className="canvas variations-view" data-testid="variations-grid">
      <div className="toolbar">
        <Icon name="compare" />
        <strong className="toolbar-title">Variations</strong>
        <span className="variations-prompt truncate" title={prompt}>
          {prompt}
        </span>
        <div className="spacer" />
        <span className="dims-readout" data-testid="variations-total">
          {money(totalCost)}
          {budget.total === null ? ' spent' : ` of ${money(budget.total)}`}
        </span>
        {anyRunning && (
          <button className="btn small danger has-icon" onClick={() => void cancelAll()}>
            <Icon name="stop" size={14} />
            Cancel all
          </button>
        )}
        <button className="btn small has-icon" onClick={props.onClose}>
          <Icon name="close" size={14} />
          Close
        </button>
      </div>
      {(props.notice || cancelError) && (
        <div className="variations-notice alert inline" role="status">
          <span>{cancelError ?? props.notice}</span>
          <button className="icon-btn small" aria-label="Dismiss" onClick={() => (cancelError ? setCancelError(null) : props.onClearNotice())}>
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
      <div className="variations-scroll">
        <div className="variations-grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: GAP }}>
          {count === 0 && <p className="stage-message">These variations are gone.</p>}
          {width > 0 &&
            directions.map((direction, index) => (
              <VariationPane
                key={direction.id}
                projectId={project.id}
                direction={direction}
                kind={project.kind}
                viewport={viewport}
                scale={scale}
                change={gate.changeFor(direction.id)}
                run={paneRuns[index] ?? { status: null, costUsd: 0, running: false }}
                current={direction.id === props.currentDirectionId}
                selecting={selectingId === direction.id}
                onToggleSelect={() => setSelectingId((id) => (id === direction.id ? null : direction.id))}
                others={directions.filter((other) => other.id !== direction.id)}
                onSwapDone={gate.onSwapDone}
                onOpen={() => props.onOpen(direction.id)}
                onKeep={() => props.onKeep(direction.id)}
                onMix={(to, element) => props.onMix(direction.id, to.id, element)}
                onError={props.onError}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export function VariationBar({ direction, onShow }: { direction: Direction; onShow: () => void }) {
  const variation = direction.variation;
  if (!variation) return null;
  return (
    <div className="variation-bar" data-testid="variation-bar">
      <span className="badge accent">{variation.label}</span>
      <span className="truncate">
        {variation.title} · one of {variation.count} variations
      </span>
      <div className="spacer" />
      <button className="btn small has-icon" onClick={onShow}>
        <Icon name="compare" size={14} />
        Show all
      </button>
    </div>
  );
}
