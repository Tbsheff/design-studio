import type { SelectionContext } from "@design-studio/contracts";
import {
  targetFrame,
  TRIGGER_LABELS,
} from "@design-studio/contracts/link-interaction";
import {
  ACTION_LABELS,
  cleanLinkText,
  EASING_LABELS,
  isBackTarget,
  isFrameAction,
  LINK_EASING_DEFAULT,
  LINK_EASINGS,
  LINK_ISSUE_TEXT,
  LINK_TRANSITIONS,
  linkAction,
  linkDuration,
  transitionLabel,
} from "@design-studio/contracts/links";
import type {
  LinkEasing,
  LinkMotion,
  LinksFile,
  LinkTarget,
  LinkTransition,
  PrototypeLink,
} from "@design-studio/contracts/links";
import { Icon, UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { lazy, Suspense, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { loadLinkInteraction } from "../../canvas-link-slots.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { framePage, frameTitle } from "./canvas-frames.js";
import { copy } from "./copy.js";
import { linksApi } from "./links-api.js";

import "../../styles/prototype.css";
import type { LinkState } from "./use-link-rects.js";

const LinkInteractionEditor = lazy(async () => {
  const mod = await loadLinkInteraction();

  return { default: mod.LinkInteractionEditor };
});

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

export function hasOutgoing(file: LinksFile, frameId: string): boolean {
  return file.links.some((link) => link.from.frame === frameId);
}

export function playStartOf(
  file: LinksFile,
  frames: readonly CanvasFrame[],
  startId: string
): string {
  if (file.start || hasOutgoing(file, startId)) {
    return startId;
  }

  return (
    frames.find((frame) => !frame.hidden && hasOutgoing(file, frame.id))?.id ??
    startId
  );
}

const protoHint = (
  frames: readonly CanvasFrame[],
  hasSelection: boolean
): string => {
  if (new Set(frames.map((frame) => framePage(frame.path))).size < 2) {
    return "Add a page first: ask in chat, or Add frame in the page menu, then pick its page.";
  }

  return hasSelection
    ? "Drag the + handle to a frame to link it."
    : "Click an element, then drag its + handle to a frame.";
};

const boxOf = (frame: CanvasFrame, active: CanvasFrame): Box => ({
  height: frame.height,
  width: frame.width,
  x: frame.x - active.x,
  y: frame.y - active.y,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const startPoint = (state: LinkState, from: Box): Point | null => {
  const { rect } = state;

  if (!rect) {
    return null;
  }

  const y = clamp(rect.y + rect.height / 2, 0, from.height);

  return {
    x: from.x + clamp(rect.x + rect.width, 0, from.width),
    y: from.y + y,
  };
};

const arrowPath = (start: Point, target: Box): { d: string; end: Point } => {
  const toRight = target.x >= start.x;

  if (!toRight) {
    const end = { x: target.x + target.width / 2, y: target.y };
    const lift = Math.max(120, Math.abs(start.y - end.y) / 2 + 120);
    const top = Math.min(start.y, end.y) - lift;

    return {
      d: `M ${start.x} ${start.y} C ${start.x + 80} ${top}, ${end.x} ${top}, ${end.x} ${end.y}`,
      end,
    };
  }

  const end = {
    x: target.x,
    y: clamp(start.y, target.y + 24, target.y + target.height - 24),
  };

  const reach = Math.max(60, (end.x - start.x) / 2);

  return {
    d: `M ${start.x} ${start.y} C ${start.x + reach} ${start.y}, ${end.x - reach} ${end.y}, ${end.x} ${end.y}`,
    end,
  };
};

const bounds = (frames: CanvasFrame[], active: CanvasFrame): Box => {
  const boxes = frames.map((frame) => boxOf(frame, active));
  const minX = Math.min(0, ...boxes.map((b) => b.x)) - PAD;
  const minY = Math.min(0, ...boxes.map((b) => b.y)) - PAD;
  const maxX = Math.max(active.width, ...boxes.map((b) => b.x + b.width)) + PAD;

  const maxY =
    Math.max(active.height, ...boxes.map((b) => b.y + b.height)) + PAD;

  return { height: maxY - minY, width: maxX - minX, x: minX, y: minY };
};

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

const ArrowMarkers = () => (
  <defs>
    <marker
      id="link-head"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" className="link-head" />
    </marker>
    <marker
      id="link-head-broken"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" className="link-head broken" />
    </marker>
  </defs>
);

export function LinkArrows({
  states,
  frames,
  active,
  startId,
  arrows,
  selectedId,
  dropTarget,
}: ArrowProps) {
  const view = bounds(frames, active);

  const frameBox = (id: string) => {
    const frame = frames.find((item) => item.id === id);

    return frame ? boxOf(frame, active) : null;
  };

  const start = frameBox(startId);
  const drop = dropTarget ? frameBox(dropTarget) : null;
  const brokenByFrame = new Map<string, LinkState[]>();

  for (const state of states) {
    if (state.issue && state.issue !== "from-frame-missing") {
      brokenByFrame.set(state.link.from.frame, [
        ...(brokenByFrame.get(state.link.from.frame) ?? []),
        state,
      ]);
    }
  }

  return (
    <div className="link-layer" aria-hidden="true">
      <svg
        className="link-arrows"
        style={{
          height: view.height,
          left: view.x,
          top: view.y,
          width: view.width,
        }}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      >
        <ArrowMarkers />
        {drop && (
          <rect
            className="link-drop"
            x={drop.x}
            y={drop.y}
            width={drop.width}
            height={drop.height}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {arrows &&
          states.map((state) => {
            const from = frameBox(state.link.from.frame);
            const begin = from ? startPoint(state, from) : null;

            if (!from || !begin || !state.rect) {
              return null;
            }

            const rect = {
              height: state.rect.height,
              width: state.rect.width,
              x: from.x + state.rect.x,
              y: from.y + state.rect.y,
            };

            const toFrame = targetFrame(state.link.to);
            const target = toFrame ? frameBox(toFrame) : null;

            const broken = state.issue !== null;
            const cls = `link-arrow${broken ? " broken" : ""}${state.link.implicit ? " implicit" : ""}${state.link.action ? " overlay" : ""}${state.link.id === selectedId ? " selected" : ""}`;

            return (
              <g
                key={state.link.id}
                className={cls}
                data-link-id={state.link.id}
              >
                <rect
                  className="link-hotspot"
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  vectorEffect="non-scaling-stroke"
                />
                {target ? (
                  <path
                    d={arrowPath(begin, target).d}
                    vectorEffect="non-scaling-stroke"
                    markerEnd={
                      broken ? "url(#link-head-broken)" : "url(#link-head)"
                    }
                  />
                ) : (
                  <path
                    d={`M ${begin.x} ${begin.y} c 40 0, 40 -40, 0 -40`}
                    vectorEffect="non-scaling-stroke"
                    markerEnd="url(#link-head)"
                  />
                )}
              </g>
            );
          })}
      </svg>
      {start && (
        <span
          className="link-start-anchor"
          style={{ left: start.x + start.width, top: start.y }}
        >
          <span className="link-start">
            <Icon name="play" size={10} />
            Start
          </span>
        </span>
      )}
      {[...brokenByFrame].map(([frameId, list]) => {
        const box = frameBox(frameId);

        if (!box) {
          return null;
        }

        return (
          <span
            key={frameId}
            className="link-broken-badge"
            data-testid="link-broken"
            style={{ left: box.x + box.width, top: box.y }}
            data-tip={list
              .map((state) => LINK_ISSUE_TEXT[state.issue ?? "element-missing"])
              .join("\n")}
          >
            <Icon name="unlink" size={11} />
            {list.length} broken
          </span>
        );
      })}
    </div>
  );
}

const frameUnder = (x: number, y: number, exclude: string): string | null => {
  for (const element of document.elementsFromPoint(x, y)) {
    const host = element.closest<HTMLElement>("[data-frame-id]");
    const id = host?.dataset.frameId;

    if (id && id !== exclude) {
      return id;
    }

    if (id === exclude && host?.classList.contains("artboard")) {
      return null;
    }
  }

  return null;
};

export function useLinkDrag(
  onDrop: (selection: SelectionContext, frameId: string) => void
) {
  const [drag, setDrag] = useState<LinkDrag | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const begin = (
    event: ReactPointerEvent<HTMLElement>,
    selection: SelectionContext,
    activeId: string
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const box = handle.getBoundingClientRect();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    handle.setPointerCapture(event.pointerId);
    setDrag({ from, target: null, to: from });

    const move = (e: PointerEvent) =>
      setDrag({
        from,
        target: frameUnder(e.clientX, e.clientY, activeId),
        to: { x: e.clientX, y: e.clientY },
      });

    const up = (e: PointerEvent) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", cancel);
      setDrag(null);
      const target = frameUnder(e.clientX, e.clientY, activeId);

      if (target) {
        dropRef.current(selection, target);
      }
    };

    const cancel = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", cancel);
      setDrag(null);
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", cancel);
  };

  return { begin, drag };
}

export function LinkHandle({
  selection,
  activeId,
  onBegin,
}: {
  selection: SelectionContext;
  activeId: string;
  onBegin: (
    event: ReactPointerEvent<HTMLElement>,
    selection: SelectionContext,
    activeId: string
  ) => void;
}) {
  const r = selection.rect;

  return (
    <div
      className="link-handle-anchor"
      style={{ left: r.x + r.width, top: r.y + r.height / 2 }}
    >
      <button
        type="button"
        className="link-handle"
        aria-label={copy.dragToA}
        data-tip={copy.dragToA}
        data-testid="link-handle"
        onPointerDown={(event) => onBegin(event, selection, activeId)}
      >
        <Icon name="plus" size={10} />
      </button>
    </div>
  );
}

export function LinkDragLine({ drag }: { drag: LinkDrag | null }) {
  if (!drag) {
    return null;
  }

  return createPortal(
    <svg className="link-drag-line" aria-hidden="true">
      <line x1={drag.from.x} y1={drag.from.y} x2={drag.to.x} y2={drag.to.y} />
      <circle cx={drag.to.x} cy={drag.to.y} r={4} />
    </svg>,
    document.body
  );
}

export function linkSourceOf(selection: SelectionContext, frame: CanvasFrame) {
  const text = cleanLinkText(selection.text);

  return {
    frame: frame.id,
    path: frame.path ?? "",
    selector: selection.selector,
    tag: selection.tag.toLowerCase(),
    ...(text ? { text } : {}),
  };
}

const sameRect = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean =>
  Math.abs(a.x - b.x) < 1 &&
  Math.abs(a.y - b.y) < 1 &&
  Math.abs(a.width - b.width) < 1 &&
  Math.abs(a.height - b.height) < 1;

export function linkOfSelection(
  states: LinkState[],
  selection: SelectionContext | undefined,
  activeId: string
): LinkState | null {
  if (!selection) {
    return null;
  }

  return (
    states.find(
      (state) =>
        state.link.from.frame === activeId &&
        (state.link.from.selector === selection.selector ||
          (state.rect !== null && sameRect(state.rect, selection.rect)))
    ) ?? null
  );
}

interface BarProps {
  projectId: string;
  file: LinksFile;
  states: LinkState[];
  frames: CanvasFrame[];
  startId: string;
  selected: LinkState | null;
  hasSelection: boolean;
  selection?: SelectionContext;
  frameTitle: (frame: CanvasFrame) => string;
  linkTitle: (link: PrototypeLink) => string;
  onError: (message: string) => void;
}

const DURATIONS = [150, 200, 320, 500, 800, 1200];

const motionOptions = (link: PrototypeLink) => {
  const duration = linkDuration(link);

  const durations = DURATIONS.includes(duration)
    ? DURATIONS
    : [...DURATIONS, duration].sort((a, b) => a - b);

  return {
    durations: durations.map((ms) => ({
      value: String(ms),
      label: `${ms} ms`,
    })),
    easings: LINK_EASINGS.map((easing) => ({
      value: easing,
      label: EASING_LABELS[easing],
    })),
    transitions: LINK_TRANSITIONS.map((transition) => ({
      value: transition,
      label: transitionLabel(transition),
    })),
  };
};

const targetOptions = (
  link: PrototypeLink,
  frames: CanvasFrame[],
  frameTitle: (frame: CanvasFrame) => string
): UiSelectOption[] => {
  const options = frames.filter((frame) => frame.id !== link.from.frame);
  const target = targetFrame(link.to);

  const missing =
    target && !options.some((frame) => frame.id === target) ? target : null;

  return [
    ...options.map((frame) => ({
      label: `Go to ${frameTitle(frame)}`,
      value: frame.id,
    })),
    ...(missing ? [{ label: "Missing frame", value: missing }] : []),
    { label: "Back", value: "back" },
  ];
};

const LinkEditor = ({
  projectId,
  state,
  frames,
  frameTitle,
  picked,
  onPicking,
  onError,
}: {
  projectId: string;
  state: LinkState;
  frames: CanvasFrame[];
  frameTitle: (frame: CanvasFrame) => string;
  picked: string | null;
  onPicking: (isPicking: boolean) => void;
  onError: (message: string) => void;
}) => {
  const { link } = state;
  const toFrames = isFrameAction(linkAction(link));

  const fail = (error: unknown) =>
    onError(error instanceof Error ? error.message : String(error));

  const change = (next: { to?: LinkTarget } & LinkMotion) => {
    if (!link.implicit) {
      return void linksApi.update(projectId, link.id, next).catch(fail);
    }

    const { to, ...motion } = next;
    void linksApi
      .keep(projectId, [link.id], motion)
      .then((file) => {
        const kept = to
          ? file.links.find(
              (item) =>
                item.from.frame === link.from.frame &&
                item.from.selector === link.from.selector
            )
          : undefined;

        if (kept && to) {
          return linksApi.update(projectId, kept.id, { to });
        }
      })
      .catch(fail);
  };

  const opts = motionOptions(link);

  return (
    <div className="proto-editor" data-testid="link-editor">
      {link.implicit && (
        <span className="proto-found" data-tip={copy.foundFromA}>
          Found in page
        </span>
      )}
      <Suspense fallback={null}>
        <LinkInteractionEditor
          key={link.id}
          projectId={projectId}
          link={link}
          frames={frames}
          picked={picked}
          onPicking={onPicking}
          onError={onError}
        />
      </Suspense>
      {toFrames && (
        <UiSelect
          className="proto-select"
          aria-label={copy.linkTarget}
          value={targetFrame(link.to) ?? "back"}
          options={targetOptions(link, frames, frameTitle)}
          onChange={(value) =>
            change({ to: value === "back" ? { back: true } : { frame: value } })
          }
        />
      )}
      {toFrames && (
        <UiSelect
          className="proto-select"
          aria-label={copy.transition}
          value={link.transition}
          options={opts.transitions}
          onChange={(value: LinkTransition) => change({ transition: value })}
        />
      )}
      {toFrames && link.transition !== "instant" && (
        <>
          <UiSelect
            className="proto-select proto-narrow"
            aria-label={copy.duration}
            value={String(linkDuration(link))}
            options={opts.durations}
            onChange={(value) => change({ duration: Number(value) })}
          />
          <UiSelect
            className="proto-select proto-narrow"
            aria-label={copy.easing}
            value={link.easing ?? LINK_EASING_DEFAULT}
            options={opts.easings}
            onChange={(value: LinkEasing) => change({ easing: value })}
          />
        </>
      )}
      {state.issue && (
        <span className="proto-broken" role="status">
          {LINK_ISSUE_TEXT[state.issue]}
        </span>
      )}
      {link.implicit ? (
        <button
          type="button"
          className="btn small"
          data-testid="link-keep"
          onClick={() => void linksApi.keep(projectId, [link.id]).catch(fail)}
        >
          Keep
        </button>
      ) : (
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.removeLink}
          data-tip={copy.removeLink}
          onClick={() => void linksApi.remove(projectId, link.id).catch(fail)}
        >
          <Icon name="unlink" size={14} />
        </button>
      )}
    </div>
  );
};

const actionMeta = (link: PrototypeLink): string => {
  const action = linkAction(link);

  if (!isFrameAction(action)) {
    return ACTION_LABELS[action];
  }

  return action === "navigate"
    ? transitionLabel(link.transition)
    : `${ACTION_LABELS[action]}, ${transitionLabel(link.transition).toLowerCase()}`;
};

const rowMeta = (link: PrototypeLink): string => {
  const meta = actionMeta(link);

  return link.trigger ? `${TRIGGER_LABELS[link.trigger.kind]}, ${meta}` : meta;
};

const LinkList = ({
  projectId,
  states,
  linkTitle,
  onError,
}: {
  projectId: string;
  states: LinkState[];
  linkTitle: (link: PrototypeLink) => string;
  onError: (message: string) => void;
}) => {
  const fail = (error: unknown) =>
    onError(error instanceof Error ? error.message : String(error));

  return (
    <div
      className="proto-list ui-popover"
      role="list"
      aria-label={copy.prototypeLinks}
      data-testid="link-list"
    >
      {states.length === 0 && <div className="proto-empty">No links yet.</div>}
      {states.map((state) => (
        <div
          key={state.link.id}
          role="listitem"
          className={`proto-row${state.issue ? " broken" : ""}${state.link.implicit ? " implicit" : ""}`}
        >
          <Icon name={state.issue ? "unlink" : "link"} size={12} />
          <span className="truncate">{linkTitle(state.link)}</span>
          <span className="proto-meta">
            {state.issue
              ? LINK_ISSUE_TEXT[state.issue]
              : state.link.implicit
                ? "Found in page"
                : rowMeta(state.link)}
          </span>
          {state.link.implicit ? (
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Keep link ${linkTitle(state.link)}`}
              data-tip={copy.keep}
              onClick={() =>
                void linksApi.keep(projectId, [state.link.id]).catch(fail)
              }
            >
              <Icon name="check" size={12} />
            </button>
          ) : (
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Remove link ${linkTitle(state.link)}`}
              onClick={() =>
                void linksApi.remove(projectId, state.link.id).catch(fail)
              }
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export function PrototypeBar(bar: BarProps) {
  const p = {
    ...bar,
    frameTitle: (frame: CanvasFrame) => frameTitle(frame, bar.frames),
  };

  const [listOpen, setListOpen] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const editing =
    (pinnedId && p.states.find((state) => state.link.id === pinnedId)) ||
    p.selected;

  const editingId = editing?.link.id ?? null;

  const onPicking = (isPicking: boolean) =>
    setPinnedId(isPicking ? editingId : null);

  const broken = p.states.filter((state) => state.issue !== null).length;
  const found = p.states.filter((state) => state.link.implicit).length;
  const savedCount = p.file.links.length - found;

  const fail = (error: unknown) =>
    p.onError(error instanceof Error ? error.message : String(error));

  const starts = p.frames.map((frame) => ({
    label: p.frameTitle(frame),
    value: frame.id,
  }));

  const startId = playStartOf(p.file, p.frames, p.startId);

  return (
    <div
      className="proto-bar"
      role="toolbar"
      aria-label={copy.prototype}
      data-testid="proto-bar"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <UiSelect
        className="proto-select proto-start"
        aria-label={copy.startFrame}
        tip="Start frame for Play"
        icon={<Icon name="play" size={12} />}
        value={startId}
        options={starts}
        onChange={(value) =>
          void linksApi.setStart(p.projectId, value).catch(fail)
        }
      />
      <div className="toolbar-sep" />
      {editing ? (
        <LinkEditor
          projectId={p.projectId}
          state={editing}
          frames={p.frames}
          frameTitle={p.frameTitle}
          picked={p.selection?.selector ?? null}
          onPicking={onPicking}
          onError={p.onError}
        />
      ) : (
        <span
          className="proto-hint truncate"
          data-tip={protoHint(p.frames, p.hasSelection)}
        >
          {protoHint(p.frames, p.hasSelection)}
        </span>
      )}
      <div className="toolbar-sep" />
      <span className="topbar-anchor">
        <button
          type="button"
          className={`btn small ghost${broken ? " proto-has-broken" : ""}`}
          aria-expanded={listOpen}
          onClick={() => setListOpen((open) => !open)}
        >
          <Icon name="link" size={12} />
          {savedCount} {savedCount === 1 ? "link" : "links"}
          {found > 0 && (
            <span className="proto-found-count" data-testid="link-found-count">
              {found} found
            </span>
          )}
          {broken > 0 && (
            <span className="proto-broken-count">{broken} broken</span>
          )}
        </button>
        {listOpen && (
          <LinkList
            projectId={p.projectId}
            states={p.states}
            linkTitle={p.linkTitle}
            onError={p.onError}
          />
        )}
      </span>
      {found > 0 && (
        <button
          type="button"
          className="btn small ghost"
          data-testid="link-keep-all"
          data-tip={copy.saveTheLinks}
          onClick={() => void linksApi.keep(p.projectId, "all").catch(fail)}
        >
          Keep all
        </button>
      )}
    </div>
  );
}
