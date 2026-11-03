import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import { Icon } from "../../kit/Icon.js";
import { openAppPanel } from "../../platform/app-status.js";
import {
  canvasStore,
  frameName,
  type CanvasFrame,
} from "./canvas-frames-model.js";
import { FlowFromHere } from "./flow-from-here.js";
import type { ResizeEdge } from "./frame-resize-handles.js";
import { FrameStateMenu } from "./frame-state-menu.js";

export interface FrameBadge {
  label: string;
  title: string;
  current: boolean;
}

export interface LabelProps {
  frame: CanvasFrame;
  active: boolean;
  removable: boolean;
  directionId: string | null;
  badge?: FrameBadge;
  number?: string;
  title?: string;
  extras?: ReactNode;
  note?: ReactNode;
  onPointerDown: (e: ReactPointerEvent, frame: CanvasFrame) => void;
  onBodyPointerDown?: (
    e: ReactPointerEvent,
    frame: CanvasFrame,
    body: boolean
  ) => void;
  onActivate: (frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onResizeStart: (
    e: ReactPointerEvent,
    frame: CanvasFrame,
    edge: ResizeEdge
  ) => void;
}

export function framePage(path: string | undefined): string {
  const clean = (path ?? "").replace(/^\/+/, "");
  if (clean === "" || /\.html?$/i.test(clean))
    return clean.replace(/^.*\//, "").replace(/\.html?$/i, "") || "index";
  return `/${clean}`;
}

export function frameBaseName(
  frame: Pick<CanvasFrame, "label" | "width" | "height">
): string {
  return frame.label?.trim() || frameName(frame);
}

export function frameTitle(
  frame: Pick<CanvasFrame, "id" | "label" | "width" | "height" | "path">,
  frames?: readonly Pick<CanvasFrame, "id">[]
): string {
  const index = frames ? frames.findIndex((item) => item.id === frame.id) : -1;
  return `${index >= 0 ? `${index + 1} ` : ""}${frameBaseName(frame)} · ${framePage(frame.path)}`;
}

export function canvasFrameName(
  projectId: string,
  frameId: string,
  fallback: string
): string {
  const frames = canvasStore.get(projectId)?.frames ?? [];
  const index = frames.findIndex((item) => item.id === frameId);
  const frame = frames[index];
  return frame ? `${index + 1} ${frameBaseName(frame)}` : fallback;
}

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function FrameLabel({
  frame,
  active,
  removable,
  directionId,
  badge,
  number,
  title,
  extras,
  note,
  onPointerDown,
  onActivate,
  onRemove,
  onNudge,
}: LabelProps) {
  const size = frameName(frame);
  const base = frameBaseName(frame);
  const name = badge ? `Variation ${badge.label}` : base;
  const owner = !badge && title && title !== frame.label ? `${title} · ` : "";
  const classes = [
    "frame-label",
    active ? "active" : "",
    badge ? "variation" : "",
    badge?.current ? "current" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      data-frame-id={frame.id}
      data-direction-id={directionId ?? undefined}
      data-testid={badge ? "variation-frame" : undefined}
      style={{ "--frame-w": `${frame.width}px` } as CSSProperties}
    >
      <button
        type="button"
        className="frame-name"
        aria-pressed={active}
        aria-label={`${name} frame`}
        data-tip={`${badge ? `${size} · ` : owner}${active ? "Drag to move, double-click to zoom" : "Click to edit, double-click to zoom"}`}
        onPointerDown={(e) => onPointerDown(e, frame)}
        onKeyDown={(e) => {
          const step = NUDGE[e.key];
          if (step) {
            e.preventDefault();
            const size = e.shiftKey ? 100 : 10;
            onNudge(frame, step[0] * size, step[1] * size);
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate(frame);
          }
        }}
      >
        {number && <span className="frame-number">{number}</span>}
        <span className="frame-title">{badge ? badge.title : base}</span>
        {!badge && frame.label?.trim() && (
          <span className="frame-size">{size}</span>
        )}
      </button>
      <FrameStateMenu frameId={frame.id} frameName={name} />
      {!badge && <FlowFromHere frameId={frame.id} frameName={name} />}
      {extras}
      {note}
      {removable && (
        <button
          type="button"
          className="frame-remove"
          aria-label={`Remove ${name} frame`}
          data-tip="Remove frame"
          onClick={() => onRemove(frame)}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

export interface FrameRedirect {
  from: string;
  to: string;
}

export function isAuthRoute(route: string): boolean {
  return /sign-?in|log-?in|auth/i.test(route);
}

export function FrameRedirectNote({
  redirect,
  onSignIn,
  onDismiss,
}: {
  redirect: FrameRedirect;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  const auth = isAuthRoute(redirect.to);
  const text = `${redirect.from} goes to ${redirect.to}.${auth ? " Sign in, or pick a public route." : ""}`;
  return (
    <div className="frame-redirect" role="status" data-tip={text}>
      <Icon name="alert" size={12} />
      <span className="frame-redirect-text">{text}</span>
      {auth && (
        <button type="button" className="btn ghost small" onClick={onSignIn}>
          Sign in
        </button>
      )}
      <button
        type="button"
        className="btn ghost small"
        onClick={() => openAppPanel("routes")}
      >
        Pick a route
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label="Dismiss"
        data-tip="Dismiss"
        onClick={onDismiss}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}
