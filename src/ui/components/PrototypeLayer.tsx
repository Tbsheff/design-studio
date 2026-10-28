import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SelectionContext } from '../../shared/contracts';
import { cleanLinkText, isBackTarget, LINK_ISSUE_TEXT, LINK_TRANSITIONS, transitionLabel, type LinksFile, type LinkTarget, type LinkTransition, type PrototypeLink } from '../../shared/links';
import type { CanvasFrame } from '../canvasFrames';
import { linksApi } from '../linksApi';
import type { LinkState } from '../useLinkRects';
import { Icon } from './Icon';
import '../styles/prototype.css';

interface Point {
  x: number;
  y: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PAD = 400;

function boxOf(frame: CanvasFrame, active: CanvasFrame): Box {
  return { x: frame.x - active.x, y: frame.y - active.y, width: frame.width, height: frame.height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function startPoint(state: LinkState, from: Box): Point | null {
  const rect = state.rect;
  if (!rect) return null;
  const y = clamp(rect.y + rect.height / 2, 0, from.height);
  return { x: from.x + clamp(rect.x + rect.width, 0, from.width), y: from.y + y };
}

function arrowPath(start: Point, target: Box): { d: string; end: Point } {
  const toRight = target.x >= start.x;
  if (!toRight) {
    const end = { x: target.x + target.width / 2, y: target.y };
    const lift = Math.max(120, Math.abs(start.y - end.y) / 2 + 120);
    const top = Math.min(start.y, end.y) - lift;
    return { d: `M ${start.x} ${start.y} C ${start.x + 80} ${top}, ${end.x} ${top}, ${end.x} ${end.y}`, end };
  }
  const end = { x: target.x, y: clamp(start.y, target.y + 24, target.y + target.height - 24) };
  const reach = Math.max(60, (end.x - start.x) / 2);
  return { d: `M ${start.x} ${start.y} C ${start.x + reach} ${start.y}, ${end.x - reach} ${end.y}, ${end.x} ${end.y}`, end };
}

function bounds(frames: CanvasFrame[], active: CanvasFrame): Box {
  const boxes = frames.map((frame) => boxOf(frame, active));
  const minX = Math.min(0, ...boxes.map((b) => b.x)) - PAD;
  const minY = Math.min(0, ...boxes.map((b) => b.y)) - PAD;
  const maxX = Math.max(active.width, ...boxes.map((b) => b.x + b.width)) + PAD;
  const maxY = Math.max(active.height, ...boxes.map((b) => b.y + b.height)) + PAD;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export interface LinkDrag {
  from: Point;
  to: Point;
  target: string | null;
}

interface ArrowProps {
  states: LinkState[];
  frames: CanvasFrame[];
  active: CanvasFrame;
  startId: string;
  arrows: boolean;
  selectedId: string | null;
  dropTarget: string | null;
}

function ArrowMarkers() {
  return (
    <defs>
      <marker id="link-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="link-head" />
      </marker>
      <marker id="link-head-broken" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="link-head broken" />
      </marker>
    </defs>
  );
}

export function LinkArrows({ states, frames, active, startId, arrows, selectedId, dropTarget }: ArrowProps) {
  const view = bounds(frames, active);
  const frameBox = (id: string) => {
    const frame = frames.find((item) => item.id === id);
    return frame ? boxOf(frame, active) : null;
  };
  const start = frameBox(startId);
  const drop = dropTarget ? frameBox(dropTarget) : null;
  const brokenByFrame = new Map<string, LinkState[]>();
  for (const state of states) if (state.issue && state.issue !== 'from-frame-missing') brokenByFrame.set(state.link.from.frame, [...(brokenByFrame.get(state.link.from.frame) ?? []), state]);
  return (
    <div className="link-layer" aria-hidden="true">
      <svg className="link-arrows" style={{ left: view.x, top: view.y, width: view.width, height: view.height }} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}>
        <ArrowMarkers />
        {drop && <rect className="link-drop" x={drop.x} y={drop.y} width={drop.width} height={drop.height} vectorEffect="non-scaling-stroke" />}
        {arrows &&
          states.map((state) => {
            const from = frameBox(state.link.from.frame);
            const begin = from ? startPoint(state, from) : null;
            if (!from || !begin || !state.rect) return null;
            const rect = { x: from.x + state.rect.x, y: from.y + state.rect.y, width: state.rect.width, height: state.rect.height };
            const target = isBackTarget(state.link.to) ? null : frameBox(state.link.to.frame);
            const broken = state.issue !== null;
            const cls = `link-arrow${broken ? ' broken' : ''}${state.link.id === selectedId ? ' selected' : ''}`;
            return (
              <g key={state.link.id} className={cls} data-link-id={state.link.id}>
                <rect className="link-hotspot" x={rect.x} y={rect.y} width={rect.width} height={rect.height} vectorEffect="non-scaling-stroke" />
                {target ? (
                  <path d={arrowPath(begin, target).d} vectorEffect="non-scaling-stroke" markerEnd={broken ? 'url(#link-head-broken)' : 'url(#link-head)'} />
                ) : (
                  <path d={`M ${begin.x} ${begin.y} c 40 0, 40 -40, 0 -40`} vectorEffect="non-scaling-stroke" markerEnd="url(#link-head)" />
                )}
              </g>
            );
          })}
      </svg>
      {start && (
        <span className="link-start" style={{ left: start.x, top: start.y }}>
          <Icon name="play" size={10} />
          Start
        </span>
      )}
      {[...brokenByFrame].map(([frameId, list]) => {
        const box = frameBox(frameId);
        if (!box) return null;
        return (
          <span key={frameId} className="link-broken-badge" data-testid="link-broken" style={{ left: box.x + box.width, top: box.y }} title={list.map((state) => LINK_ISSUE_TEXT[state.issue ?? 'element-missing']).join('\n')}>
            <Icon name="unlink" size={11} />
            {list.length} broken
          </span>
        );
      })}
    </div>
  );
}

function frameUnder(x: number, y: number, exclude: string): string | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const host = element.closest<HTMLElement>('[data-frame-id]');
    const id = host?.dataset.frameId;
    if (id && id !== exclude) return id;
    if (id === exclude && host?.classList.contains('artboard')) return null;
  }
  return null;
}

export function useLinkDrag(onDrop: (selection: SelectionContext, frameId: string) => void) {
  const [drag, setDrag] = useState<LinkDrag | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  const begin = (event: ReactPointerEvent<HTMLElement>, selection: SelectionContext, activeId: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const box = handle.getBoundingClientRect();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    handle.setPointerCapture(event.pointerId);
    setDrag({ from, to: from, target: null });
    const move = (e: PointerEvent) => setDrag({ from, to: { x: e.clientX, y: e.clientY }, target: frameUnder(e.clientX, e.clientY, activeId) });
    const up = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', cancel);
      setDrag(null);
      const target = frameUnder(e.clientX, e.clientY, activeId);
      if (target) dropRef.current(selection, target);
    };
    const cancel = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', cancel);
      setDrag(null);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', cancel);
  };
  return { drag, begin };
}

export function LinkHandle({ selection, activeId, onBegin }: { selection: SelectionContext; activeId: string; onBegin: (event: ReactPointerEvent<HTMLElement>, selection: SelectionContext, activeId: string) => void }) {
  const r = selection.rect;
  return (
    <div className="link-handle-anchor" style={{ left: r.x + r.width, top: r.y + r.height / 2 }}>
      <button type="button" className="link-handle" aria-label="Drag to a frame to link" data-tip="Drag to a frame to link" data-testid="link-handle" onPointerDown={(event) => onBegin(event, selection, activeId)}>
        <Icon name="plus" size={10} />
      </button>
    </div>
  );
}

export function LinkDragLine({ drag }: { drag: LinkDrag | null }) {
  if (!drag) return null;
  return createPortal(
    <svg className="link-drag-line" aria-hidden="true">
      <line x1={drag.from.x} y1={drag.from.y} x2={drag.to.x} y2={drag.to.y} />
      <circle cx={drag.to.x} cy={drag.to.y} r={4} />
    </svg>,
    document.body,
  );
}

export function linkSourceOf(selection: SelectionContext, frame: CanvasFrame) {
  const text = cleanLinkText(selection.text);
  return { frame: frame.id, path: frame.path ?? '', selector: selection.selector, tag: selection.tag.toLowerCase(), ...(text ? { text } : {}) };
}

function sameRect(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}

export function linkOfSelection(states: LinkState[], selection: SelectionContext | undefined, activeId: string): LinkState | null {
  if (!selection) return null;
  return states.find((state) => state.link.from.frame === activeId && (state.link.from.selector === selection.selector || (state.rect !== null && sameRect(state.rect, selection.rect)))) ?? null;
}

interface BarProps {
  projectId: string;
  file: LinksFile;
  states: LinkState[];
  frames: CanvasFrame[];
  startId: string;
  selected: LinkState | null;
  hasSelection: boolean;
  frameTitle: (frame: CanvasFrame) => string;
  linkTitle: (link: PrototypeLink) => string;
  onPlay: () => void;
  onError: (message: string) => void;
}

function targetValue(to: LinkTarget): string {
  return isBackTarget(to) ? 'back' : to.frame;
}

function LinkEditor({ projectId, state, frames, frameTitle, onError }: { projectId: string; state: LinkState; frames: CanvasFrame[]; frameTitle: (frame: CanvasFrame) => string; onError: (message: string) => void }) {
  const link = state.link;
  const fail = (error: unknown) => onError(error instanceof Error ? error.message : String(error));
  const options = frames.filter((frame) => frame.id !== link.from.frame);
  const target = isBackTarget(link.to) ? null : link.to.frame;
  const missing = target && !options.some((frame) => frame.id === target) ? target : null;
  return (
    <div className="proto-editor" data-testid="link-editor">
      <span className="proto-label">On click</span>
      <select
        className="proto-select"
        aria-label="Link target"
        value={targetValue(link.to)}
        onChange={(event) => {
          const value = event.target.value;
          void linksApi.update(projectId, link.id, { to: value === 'back' ? { back: true } : { frame: value } }).catch(fail);
        }}
      >
        {options.map((frame) => (
          <option key={frame.id} value={frame.id}>
            Go to {frameTitle(frame)}
          </option>
        ))}
        {missing && <option value={missing}>Missing frame</option>}
        <option value="back">Back</option>
      </select>
      <select className="proto-select" aria-label="Transition" value={link.transition} onChange={(event) => void linksApi.update(projectId, link.id, { transition: event.target.value as LinkTransition }).catch(fail)}>
        {LINK_TRANSITIONS.map((transition) => (
          <option key={transition} value={transition}>
            {transitionLabel(transition)}
          </option>
        ))}
      </select>
      {state.issue && (
        <span className="proto-broken" role="status">
          {LINK_ISSUE_TEXT[state.issue]}
        </span>
      )}
      <button type="button" className="icon-btn small" aria-label="Remove link" data-tip="Remove link" onClick={() => void linksApi.remove(projectId, link.id).catch(fail)}>
        <Icon name="unlink" size={14} />
      </button>
    </div>
  );
}

function LinkList({ projectId, states, linkTitle, onError }: { projectId: string; states: LinkState[]; linkTitle: (link: PrototypeLink) => string; onError: (message: string) => void }) {
  const fail = (error: unknown) => onError(error instanceof Error ? error.message : String(error));
  return (
    <div className="proto-list ui-popover" role="list" aria-label="Prototype links" data-testid="link-list">
      {states.length === 0 && <div className="proto-empty">No links yet.</div>}
      {states.map((state) => (
        <div key={state.link.id} role="listitem" className={`proto-row${state.issue ? ' broken' : ''}`}>
          <Icon name={state.issue ? 'unlink' : 'link'} size={12} />
          <span className="truncate">{linkTitle(state.link)}</span>
          <span className="proto-meta">{state.issue ? LINK_ISSUE_TEXT[state.issue] : transitionLabel(state.link.transition)}</span>
          <button type="button" className="icon-btn small" aria-label={`Remove link ${linkTitle(state.link)}`} onClick={() => void linksApi.remove(projectId, state.link.id).catch(fail)}>
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function PrototypeBar(p: BarProps) {
  const [listOpen, setListOpen] = useState(false);
  const broken = p.states.filter((state) => state.issue !== null).length;
  const fail = (error: unknown) => p.onError(error instanceof Error ? error.message : String(error));
  return (
    <div className="proto-bar" role="toolbar" aria-label="Prototype" data-testid="proto-bar" onPointerDown={(event) => event.stopPropagation()}>
      <label className="proto-start">
        <Icon name="play" size={12} />
        <span className="proto-label">Start</span>
        <select className="proto-select" aria-label="Start frame" value={p.startId} onChange={(event) => void linksApi.setStart(p.projectId, event.target.value).catch(fail)}>
          {p.frames.map((frame) => (
            <option key={frame.id} value={frame.id}>
              {p.frameTitle(frame)}
            </option>
          ))}
        </select>
      </label>
      <div className="toolbar-sep" />
      {p.selected ? (
        <LinkEditor projectId={p.projectId} state={p.selected} frames={p.frames} frameTitle={p.frameTitle} onError={p.onError} />
      ) : (
        <span className="proto-hint">{p.hasSelection ? 'Drag the + handle to a frame to link it.' : 'Click an element, then drag its + handle to a frame.'}</span>
      )}
      <div className="toolbar-sep" />
      <span className="topbar-anchor">
        <button type="button" className={`btn small ghost${broken ? ' proto-has-broken' : ''}`} aria-expanded={listOpen} onClick={() => setListOpen((open) => !open)}>
          <Icon name="link" size={12} />
          {p.file.links.length} {p.file.links.length === 1 ? 'link' : 'links'}
          {broken > 0 && <span className="proto-broken-count">{broken} broken</span>}
        </button>
        {listOpen && <LinkList projectId={p.projectId} states={p.states} linkTitle={p.linkTitle} onError={p.onError} />}
      </span>
      <button type="button" className="btn small strong" data-testid="proto-play" onClick={p.onPlay}>
        <Icon name="play" size={12} />
        Play
      </button>
    </div>
  );
}
