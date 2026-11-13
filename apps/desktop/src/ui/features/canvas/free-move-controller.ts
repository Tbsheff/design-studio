import type {
  FreeMoveDrag,
  FreeMoveStart,
  SelectionContext,
} from "@design-studio/contracts";
import type { RefObject } from "react";

import { place, transformOf } from "./free-move-model.js";
import type {
  FreeMoveOptions,
  FreeMoveSession,
  FreeMoveView,
  Placed,
} from "./free-move-model.js";

type CommitWrite = (() => Promise<void>) | null;

interface MoveContext {
  readonly commit: (
    session: FreeMoveSession,
    drag: FreeMoveDrag,
    placed: Placed
  ) => CommitWrite;
  readonly live: RefObject<FreeMoveOptions>;
  readonly session: { current: FreeMoveSession | null };
  readonly setView: (view: FreeMoveView | null) => void;
}

interface MoveController {
  readonly begin: (start: FreeMoveStart) => void;
  readonly update: (drag: FreeMoveDrag) => void;
  readonly drop: (drag: FreeMoveDrag) => void;
  readonly end: (isCommitting: boolean) => void;
  readonly onKey: (event: KeyboardEvent) => void;
}

const NO_SOURCE_TEXT =
  "This element has no source location, so it cannot move here.";

const toSingleTarget = (
  selection: SelectionContext[]
): SelectionContext | null => {
  if (selection.length === 1) {
    return selection[0] ?? null;
  }

  return null;
};

const isMovable = (
  cur: FreeMoveOptions,
  target: SelectionContext | null,
  start: FreeMoveStart
): boolean =>
  cur.enabled &&
  Boolean(cur.directionId) &&
  Boolean(target?.source) &&
  target?.selector === start.selector;

const isMissingSource = (
  cur: FreeMoveOptions,
  target: SelectionContext | null,
  start: FreeMoveStart
): boolean =>
  cur.enabled && !target?.source && target?.selector === start.selector;

const toCandidates = (start: FreeMoveStart): FreeMoveStart["siblings"] => {
  if (start.parent) {
    return [start.parent, ...start.siblings];
  }

  return start.siblings;
};

const createEnd =
  (context: MoveContext): MoveController["end"] =>
  (isCommitting: boolean): void => {
    const { live, session, setView } = context;

    if (!session.current) {
      return;
    }

    session.current = null;
    setView(null);
    document.body.classList.remove("element-moving");
    live.current.post({ type: "preview-reset" });
    live.current.holdSwap?.(false, !isCommitting);
  };

const createKey =
  (context: MoveContext, end: MoveController["end"]): MoveController["onKey"] =>
  (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !context.session.current) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    context.live.current.post({ type: "move-cancel" });
    end(false);
  };

const createBegin =
  (context: MoveContext): MoveController["begin"] =>
  (start: FreeMoveStart): void => {
    const { live, session, setView } = context;
    const cur = live.current;
    const target = toSingleTarget(cur.selection);

    if (!target || !isMovable(cur, target, start)) {
      cur.post({ type: "move-cancel" });

      if (isMissingSource(cur, target, start)) {
        cur.onError(NO_SOURCE_TEXT);
      }

      return;
    }

    session.current = {
      candidates: toCandidates(start),
      lines: cur.readLines(cur.zoom),
      start,
      target,
    };
    document.body.classList.add("element-moving");
    cur.holdSwap?.(true, false);
    setView({
      box: start.rect,
      copy: false,
      guides: [],
      line: null,
      spacing: [],
    });
  };

const createUpdate =
  (context: MoveContext): MoveController["update"] =>
  (drag: FreeMoveDrag): void => {
    const { live, session, setView } = context;
    const text = session.current;

    if (!text) {
      return;
    }

    const placed = place(text, drag, live.current.zoom);
    let transform = transformOf(text, placed.dx, placed.dy);

    if (drag.alt) {
      transform = transformOf(text, 0, 0);
    }

    live.current.post({
      selector: text.start.selector,
      style: { transform },
      type: "preview-style",
    });
    setView(placed.view);
  };

const createDrop =
  (context: MoveContext, end: MoveController["end"]): MoveController["drop"] =>
  (drag: FreeMoveDrag): void => {
    const { live, session } = context;
    const { current } = session;

    if (!current) {
      return;
    }

    const placed = place(current, drag, live.current.zoom);
    const write = context.commit(current, drag, placed);
    end(write !== null);

    if (write) {
      void write();
    }
  };

const createMoveController = (context: MoveContext): MoveController => {
  const end = createEnd(context);
  const begin = createBegin(context);
  const drop = createDrop(context, end);
  const onKey = createKey(context, end);
  const update = createUpdate(context);

  return { begin, drop, end, onKey, update };
};

export { createMoveController };
