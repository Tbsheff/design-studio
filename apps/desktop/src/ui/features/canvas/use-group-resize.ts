import { routes as directEditRoutes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useTransition } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { groupResizeCopy } from "./copy.js";
import {
  isGroupDrag,
  isScaled,
  toGroupBatch,
  toGroupFactor,
  toGroupLayer,
  toGroupRect,
  toGroupStyle,
  toPreviewStyle,
  toStyleKeys,
} from "./group-resize-model.js";
import type {
  GroupBatchBody,
  GroupBox,
  GroupEdge,
  GroupFactor,
  GroupKey,
  GroupLayer,
  GroupStyle,
} from "./group-resize-model.js";
import type { GroupDown, Options } from "./resize-handles-model.js";
import { toScale } from "./resize-handles-model.js";
import { unionBox } from "./snap-model.js";
import { toClassesOf } from "./use-rotate-drag.js";

interface GroupResize {
  readonly box: LiveStore<GroupBox | null>;
  readonly onGroupDown: GroupDown;
}

interface GroupRequest {
  readonly factor: GroupFactor;
  readonly layers: Promise<readonly GroupLayer[]>;
  readonly options: Options;
  readonly targets: readonly SelectionContext[];
}

interface GroupSession {
  readonly box: LiveStore<GroupBox | null>;
  readonly commit: (request: GroupRequest) => void;
  readonly live: RefObject<Options>;
}

interface GroupMove {
  factor: GroupFactor;
  isMoved: boolean;
  layers: readonly GroupLayer[];
}

interface GroupRun {
  readonly box: GroupBox;
  readonly edge: GroupEdge;
  readonly session: GroupSession;
  readonly startX: number;
  readonly startY: number;
  readonly state: GroupMove;
  readonly targets: readonly SelectionContext[];
  readonly touched: readonly Set<GroupKey>[];
  readonly zoom: number;
}

const RESIZING_CLASS = "element-resizing";

const NO_FACTOR: GroupFactor = { originX: 0, originY: 0, scaleX: 1, scaleY: 1 };

const toLayersOf = async (
  options: Options,
  targets: readonly SelectionContext[]
): Promise<readonly GroupLayer[]> => {
  const answers = await Promise.all(
    targets.map(async (target) => await toClassesOf(options, target))
  );

  return targets.map((target, index) =>
    toGroupLayer(target, answers[index]?.classes ?? null)
  );
};

const trackLayers = async (
  pending: Promise<readonly GroupLayer[]>,
  state: GroupMove
): Promise<void> => {
  state.layers = await pending;
};

const postPreview = (run: GroupRun): void => {
  for (const [index, target] of run.targets.entries()) {
    const layer = run.state.layers[index];
    const touched = run.touched[index];

    if (layer && touched) {
      const style = toGroupStyle(layer, run.state.factor);

      for (const key of toStyleKeys(style)) {
        touched.add(key);
      }

      run.session.live.current.post({
        selector: target.selector,
        style: toPreviewStyle(layer, style, touched),
        type: "preview-style",
      });
    }
  }
};

const moveGroup = (run: GroupRun, event: PointerEvent): void => {
  const delta = {
    dx: (event.clientX - run.startX) / run.zoom,
    dy: (event.clientY - run.startY) / run.zoom,
  };

  if (!run.state.isMoved && !isGroupDrag(delta)) {
    return;
  }

  run.state.isMoved = true;
  run.state.factor = toGroupFactor(run.edge, run.box, delta, {
    isCentered: event.altKey,
    isRatio: event.shiftKey,
  });
  run.session.box.set(toGroupRect(run.box, run.state.factor));
  postPreview(run);
};

const listenGroup = (
  run: GroupRun,
  pending: Promise<readonly GroupLayer[]>,
  handle: HTMLElement
): void => {
  const abort = new AbortController();
  const { signal } = abort;
  const { session, state } = run;

  const end = (isCommitting: boolean): void => {
    abort.abort();
    session.box.set(null);
    document.body.classList.remove(RESIZING_CLASS);
    session.live.current.holdSwap?.(false, !isCommitting);
  };

  const cancel = (): void => {
    end(false);

    if (state.isMoved) {
      session.live.current.post({ type: "preview-reset" });
    }
  };

  const onUp = (): void => {
    if (!state.isMoved || !isScaled(state.factor)) {
      cancel();

      return;
    }

    end(true);
    session.commit({
      factor: state.factor,
      layers: pending,
      options: session.live.current,
      targets: run.targets,
    });
  };

  const onEscape = (key: KeyboardEvent): void => {
    if (key.key === "Escape") {
      key.preventDefault();
      key.stopPropagation();
      cancel();
    }
  };

  const onMove = (move: PointerEvent): void => moveGroup(run, move);

  handle.addEventListener("pointermove", onMove, { signal });
  handle.addEventListener("pointerup", onUp, { signal });
  handle.addEventListener("pointercancel", cancel, { signal });
  globalThis.addEventListener("keydown", onEscape, { capture: true, signal });
};

const beginGroup = (
  session: GroupSession,
  targets: readonly SelectionContext[],
  edge: GroupEdge,
  event: ReactPointerEvent<HTMLElement>
): void => {
  const box = unionBox(targets.map((target) => target.rect));

  if (event.button !== 0 || targets.length < 2 || box === null) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add(RESIZING_CLASS);
  session.live.current.holdSwap?.(true, false);

  const state: GroupMove = {
    factor: NO_FACTOR,
    isMoved: false,
    layers: targets.map((target) => toGroupLayer(target, null)),
  };

  const pending = toLayersOf(session.live.current, targets);
  void trackLayers(pending, state);
  session.box.set(box);

  const { clientX: startX, clientY: startY } = event;

  const run: GroupRun = {
    box,
    edge,
    session,
    startX,
    startY,
    state,
    targets,
    touched: targets.map(() => new Set<GroupKey>()),
    zoom: toScale(handle) || 1,
  };

  listenGroup(run, pending, handle);
};

const toOptimisticId = (): string => `group-resize-${crypto.randomUUID()}`;

const postOptimistic = (
  options: Options,
  body: GroupBatchBody
): readonly string[] =>
  body.edits.map((edit) => {
    const id = toOptimisticId();

    options.post({
      id,
      patch: { selector: edit.selector, style: edit.style, trusted: true },
      type: "optimistic-apply",
      written: false,
    });

    return id;
  });

const postSettled = (
  options: Options,
  ids: readonly string[],
  isOk: boolean
): void => {
  for (const id of ids) {
    if (isOk) {
      options.post({ id, ok: true, type: "optimistic-settle" });
    } else {
      options.post({
        id,
        ok: false,
        reason: groupResizeCopy.failed,
        type: "optimistic-settle",
      });
    }
  }
};

const toStyles = (
  layers: readonly GroupLayer[],
  factor: GroupFactor
): readonly GroupStyle[] => layers.map((layer) => toGroupStyle(layer, factor));

const useGroupCommit = (): GroupSession["commit"] => {
  const { run } = useAction(directEditRoutes.applyDirectEdit);
  const [, startWork] = useTransition();

  return useCallback(
    (request: GroupRequest): void => {
      const { options, targets } = request;
      const { directionId } = options;

      if (directionId === null) {
        return;
      }

      startWork(async () => {
        const styles = toStyles(await request.layers, request.factor);

        const body = toGroupBatch(
          { directionId, projectId: options.projectId },
          targets,
          styles
        );

        if (body.edits.length === 0) {
          options.post({ type: "preview-reset" });

          return;
        }

        const ids = postOptimistic(options, body);
        const result = await run(body);

        if (result === null) {
          postSettled(options, ids, false);
          options.onError(groupResizeCopy.failed);

          return;
        }

        postSettled(options, ids, true);
        options.refreshRects();
      });
    },
    [run]
  );
};

const useGroupResize = (
  live: RefObject<Options>,
  targets: readonly SelectionContext[]
): GroupResize => {
  const box = useMemo(() => createLiveStore<GroupBox | null>(null), []);
  const commit = useGroupCommit();

  const session = useMemo(() => ({ box, commit, live }), [box, commit, live]);

  const onGroupDown = useCallback(
    (edge: GroupEdge, event: ReactPointerEvent<HTMLElement>): void =>
      beginGroup(session, targets, edge, event),
    [session, targets]
  );

  return { box, onGroupDown };
};

export { useGroupResize };

export type { GroupResize };
