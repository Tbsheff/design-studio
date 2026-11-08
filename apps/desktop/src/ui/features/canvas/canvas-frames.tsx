import { Icon } from "@design-studio/ui";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  ReactElement,
} from "react";

import { openAppPanel } from "../../platform/app-status.js";
import { frameName } from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { FlowFromHere } from "./flow-from-here.js";
import type { ResizeEdge } from "./frame-resize-handles.js";
import { FrameStateMenu } from "./frame-state-menu.js";

const SIZE_100 = 100;

const SIZE_10 = 10;

interface FrameBadge {
  label: string;
  title: string;
  current: boolean;
}

interface LabelProps {
  frame: CanvasFrame;
  active: boolean;
  removable: boolean;
  directionId: string | null;
  badge?: FrameBadge;
  number?: string;
  title?: string;
  extras?: ReactNode;
  note?: ReactNode;
  onPointerDown: (event: ReactPointerEvent, frame: CanvasFrame) => void;
  onBodyPointerDown?: (
    eventValue: ReactPointerEvent,
    frame: CanvasFrame,
    body: boolean
  ) => void;
  onActivate: (frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onResizeStart: (
    event3: ReactPointerEvent,
    frame: CanvasFrame,
    edge: ResizeEdge
  ) => void;
}

const framePage = (path: string | undefined): string => {
  const clean = (path ?? "").replace(/^\/+/u, "");

  if (clean === "" || /\.html?$/iu.test(clean)) {
    return clean.replace(/^.*\//u, "").replace(/\.html?$/iu, "") || "index";
  }

  return `/${clean}`;
};

const frameBaseName = (
  frame: Pick<CanvasFrame, "label" | "width" | "height">
): string => frame.label?.trim() || frameName(frame);

const frameTitle = (
  frame: Pick<CanvasFrame, "id" | "label" | "width" | "height" | "path">,
  frames?: readonly Pick<CanvasFrame, "id">[]
): string => {
  let index = -1;

  if (frames) {
    index = frames.findIndex((item) => item.id === frame.id);
  }

  let part = "";

  if (index >= 0) {
    part = `${index + 1} `;
  }

  return `${part}${frameBaseName(frame)} · ${framePage(frame.path)}`;
};

const canvasFrameName = (
  projectId: string,
  frameId: string,
  fallback: string
): string => {
  const frames = canvasStore.get(projectId)?.frames ?? [];
  const index = frames.findIndex((item) => item.id === frameId);
  const frame = frames[index];

  if (frame) {
    return `${index + 1} ${frameBaseName(frame)}`;
  }

  return fallback;
};

const NUDGE: Record<string, [number, number]> = {
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
};

const FrameLabel = ({
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
}: LabelProps): ReactElement => {
  const size = frameName(frame);
  const base = frameBaseName(frame);

  let name: string = base;

  if (badge) {
    name = `Variation ${badge.label}`;
  }

  let owner = "";

  if (!badge && title && title !== frame.label) {
    owner = `${title} · `;
  }

  let result: "" | "active" = "";

  if (active) {
    result = "active";
  }

  let result2: "" | "variation" = "";

  if (badge) {
    result2 = "variation";
  }

  let result3: "" | "current" = "";

  if (badge?.current) {
    result3 = "current";
  }

  const classes = ["frame-label", result, result2, result3]
    .filter(Boolean)
    .join(" ");

  const datatestid: "variation-frame" | undefined = (():
    | "variation-frame"
    | undefined => {
    if (!badge) {
      return undefined;
    }

    return "variation-frame";
  })();

  let part3: string = owner;

  if (badge) {
    part3 = `${size} · `;
  }

  let part4:
    | "Drag to move, double-click to zoom"
    | "Click to edit, double-click to zoom" =
    "Click to edit, double-click to zoom";

  if (active) {
    part4 = "Drag to move, double-click to zoom";
  }

  let content: string = base;

  if (badge) {
    content = badge.title;
  }

  return (
    <div
      className={classes}
      data-frame-id={frame.id}
      data-direction-id={directionId ?? undefined}
      data-testid={datatestid}
      style={{ "--frame-w": `${frame.width}px` } as CSSProperties}
    >
      <button
        type="button"
        className="frame-name"
        aria-pressed={active}
        aria-label={`${name} frame`}
        data-tip={`${part3}${part4}`}
        onPointerDown={(event4) => onPointerDown(event4, frame)}
        onKeyDown={(event5) => {
          const step = NUDGE[event5.key];

          if (step) {
            event5.preventDefault();

            let distance: number = SIZE_10;

            if (event5.shiftKey) {
              distance = SIZE_100;
            }

            onNudge(frame, step[0] * distance, step[1] * distance);
          } else if (event5.key === "Enter" || event5.key === " ") {
            event5.preventDefault();
            onActivate(frame);
          }
        }}
      >
        {number && <span className="frame-number">{number}</span>}
        <span className="frame-title">{content}</span>
        {!badge && frame.label?.trim() && (
          <span className="frame-size">{size}</span>
        )}
      </button>
      <FrameStateMenu
        frameId={frame.id}
        frameName={name}
        directionId={directionId}
      />
      {!badge && <FlowFromHere frameId={frame.id} frameName={name} />}
      {extras}
      {note}
      {removable && (
        <button
          type="button"
          className="frame-remove"
          aria-label={`Remove ${name} frame`}
          data-tip={copy.removeFrame}
          onClick={() => onRemove(frame)}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
};

interface FrameRedirect {
  from: string;
  to: string;
}

const isAuthRoute = (route: string): boolean =>
  /sign-?in|log-?in|auth/iu.test(route);

const FrameRedirectNote = ({
  redirect,
  onSignIn,
  onDismiss,
}: {
  redirect: FrameRedirect;
  onSignIn: () => void;
  onDismiss: () => void;
}): ReactElement => {
  const auth = isAuthRoute(redirect.to);

  let part2: "" | " Sign in, or pick a public route." = "";

  if (auth) {
    part2 = " Sign in, or pick a public route.";
  }

  const text = `${redirect.from} goes to ${redirect.to}.${part2}`;

  return (
    <div className="frame-redirect" role="status" data-tip={text}>
      <Icon name="alert" size={12} />
      <span className="frame-redirect-text">{text}</span>
      {auth && (
        <button type="button" className="btn ghost small" onClick={onSignIn}>
          {copy.signIn}
        </button>
      )}
      <button
        type="button"
        className="btn ghost small"
        onClick={() => openAppPanel("routes")}
      >
        {copy.pickARoute}
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        data-tip={copy.dismiss}
        onClick={onDismiss}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
};

export {
  FrameLabel,
  FrameRedirectNote,
  canvasFrameName,
  frameBaseName,
  framePage,
  frameTitle,
  isAuthRoute,
};

export type { FrameBadge, FrameRedirect, LabelProps };
