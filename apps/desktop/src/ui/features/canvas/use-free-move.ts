import type {
  FreeMoveDrag,
  SelectionContext,
  StructureTarget,
} from "@design-studio/contracts";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";

import { api, errorText } from "../../api.js";
import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { startOptimistic } from "../inspector/optimistic-edit.js";
import { selectionTargets } from "../inspector/structure-edits.js";
import { buildEditRequest, mergeCommit } from "../inspector/use-direct-edit.js";
import { createMoveController } from "./free-move-controller.js";
import { absoluteStyle } from "./free-move-model.js";
import type {
  AbsoluteStyle,
  FreeMoveOptions,
  FreeMoveSession,
  FreeMoveView,
  Placed,
} from "./free-move-model.js";

type CommitWrite = (() => Promise<void>) | null;

const toRevertStyle = (
  target: SelectionContext,
  style: AbsoluteStyle
): Record<string, string> =>
  Object.fromEntries(
    Object.keys(style).map((key) => [key, target.styles[key] ?? ""])
  );

const saveStyle = async (
  live: RefObject<FreeMoveOptions>,
  target: SelectionContext,
  style: AbsoluteStyle
): Promise<void> => {
  const cur = live.current;
  const req = buildEditRequest(target, style);

  if (!req || !cur.directionId) {
    return;
  }

  const { selector } = target;
  cur.setSelection((prev) => mergeCommit(prev, { selector, style }));

  const optimistic = startOptimistic(
    { post: cur.post, refreshRects: cur.refreshRects },
    req,
    (message) => live.current.onError(message)
  );

  try {
    const result = await api.directEdit(cur.projectId, cur.directionId, req);
    optimistic.saved(result.tailwind);
    live.current.refreshRects();
  } catch (error) {
    optimistic.failed(errorText(error));
    const back = toRevertStyle(target, style);

    live.current.setSelection((prev) =>
      mergeCommit(prev, { selector, style: back })
    );
    live.current.onError(errorText(error));
  }
};

const isMoved = (drag: FreeMoveDrag, placed: Placed): boolean =>
  Boolean(drag.insert) || placed.dx !== 0 || placed.dy !== 0;

const toBlockedMessage = (
  drag: FreeMoveDrag,
  placed: Placed
): string | null => {
  if (drag.note || isMoved(drag, placed)) {
    return drag.note ?? "Wait for the last edit to finish.";
  }

  return null;
};

const toFlowWrite = (
  cur: FreeMoveOptions,
  drag: FreeMoveDrag,
  target: StructureTarget
): CommitWrite => {
  const ref = drag.insert?.ref;

  if (!ref) {
    return null;
  }

  let self: StructureTarget = target;

  if (drag.insert?.self) {
    self = { ...drag.insert.self, selector: target.selector };
  }

  let op: "move" | "duplicate" = "move";

  if (drag.alt) {
    op = "duplicate";
  }

  let placement: { after: StructureTarget } | { before: StructureTarget } = {
    before: ref,
  };

  if (drag.insert?.after) {
    placement = { after: ref };
  }

  return () => cur.applyStructure({ op, targets: [self], ...placement });
};

const toAbsoluteWrite = (
  live: RefObject<FreeMoveOptions>,
  session: FreeMoveSession,
  drag: FreeMoveDrag,
  placed: Placed
): CommitWrite => {
  const target = selectionTargets([session.target])?.[0];

  if (!target || (placed.dx === 0 && placed.dy === 0)) {
    return null;
  }

  const style = absoluteStyle(session, placed.dx, placed.dy);

  if (drag.alt) {
    const targets = [target];

    return () =>
      live.current.applyStructure({ op: "duplicate", style, targets });
  }

  return () => saveStyle(live, session.target, style);
};

const commitPlan = (
  live: RefObject<FreeMoveOptions>,
  session: FreeMoveSession,
  drag: FreeMoveDrag,
  placed: Placed
): CommitWrite => {
  const cur = live.current;

  if (drag.note || cur.busy) {
    const message = toBlockedMessage(drag, placed);

    if (message) {
      cur.onError(message);
    }

    return null;
  }

  const target = selectionTargets([session.target])?.[0];

  if (target && session.start.mode === "flow") {
    return toFlowWrite(cur, drag, target);
  }

  return toAbsoluteWrite(live, session, drag, placed);
};

const useFreeMove = (
  options: FreeMoveOptions
): LiveStore<FreeMoveView | null> => {
  const live = useRef(options);
  useLayoutEffect(() => {
    live.current = options;
  });
  const session = useRef<FreeMoveSession | null>(null);
  const view = useMemo(() => createLiveStore<FreeMoveView | null>(null), []);
  const setView = view.set;
  const { listen } = options;

  useEffect(() => {
    const commit = (
      current: FreeMoveSession,
      drag: FreeMoveDrag,
      placed: Placed
    ): CommitWrite => commitPlan(live, current, drag, placed);

    const controller = createMoveController({ commit, live, session, setView });

    globalThis.addEventListener("keydown", controller.onKey, true);

    const stop = listen((message) => {
      switch (message.type) {
        case "move-start": {
          controller.begin(message.move);
          break;
        }

        case "move-live": {
          controller.update(message.drag);
          break;
        }

        case "move-drop": {
          controller.drop(message.drag);
          break;
        }

        case "move-cancel":
        case "ready": {
          controller.end(false);
          break;
        }

        default: {
          break;
        }
      }
    });

    return (): void => {
      stop();
      controller.end(false);
      globalThis.removeEventListener("keydown", controller.onKey, true);
    };
  }, [listen, setView]);

  return view;
};

export { useFreeMove };

export type { FreeMoveView };
