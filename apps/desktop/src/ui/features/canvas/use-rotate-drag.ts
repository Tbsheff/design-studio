import { routes as directEditRoutes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useTransition } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { api } from "../../api.js";
import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { rotateHandleCopy } from "./copy.js";
import type { Options } from "./resize-handles-model.js";
import { toScale } from "./resize-handles-model.js";
import {
  isRotateDrag,
  toGroupAngles,
  toMoveStyle,
  toPointerAngle,
  toPreviewRotate,
  toRotateBase,
  toRotateBatch,
  toRotateBody,
  toRotateEdit,
  toRotateLayout,
  toRotateValue,
} from "./rotate-drag-model.js";
import type {
  RotateBase,
  RotateBatchBody,
  RotateBody,
  RotateLabel,
  RotateLayerInput,
  RotateLayout,
  RotatePoint,
  RotateStyle,
} from "./rotate-drag-model.js";

interface RotateDrag {
  readonly label: LiveStore<RotateLabel | null>;
  readonly onRotateDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface RotateRequest {
  readonly angles: readonly number[];
  readonly layout: Promise<RotateLayout | null>;
  readonly options: Options;
  readonly targets: readonly SelectionContext[];
  readonly turn: number;
}

interface RotateSession {
  readonly commit: (request: RotateRequest) => void;
  readonly label: LiveStore<RotateLabel | null>;
  readonly live: RefObject<Options>;
}

interface RotateMove {
  angles: readonly number[];
  isMoved: boolean;
  layout: RotateLayout | null;
  turn: number;
}

interface RotateFrame {
  readonly center: RotatePoint;
  readonly left: number;
  readonly top: number;
  readonly zoom: number;
}

const ROTATING_CLASS = "element-rotating";

const toFrame = (handle: HTMLElement): RotateFrame => {
  const frame = handle.closest(".resize-frame") ?? handle;
  const box = frame.getBoundingClientRect();

  return {
    center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
    left: box.left,
    top: box.top,
    zoom: toScale(handle) || 1,
  };
};

const postPreview = (run: RotateRun): void => {
  const { layout, turn } = run.state;

  for (const [index, target] of run.targets.entries()) {
    const base = run.bases[index];
    const angle = run.state.angles[index] ?? null;

    if (base && angle !== null) {
      run.session.live.current.post({
        selector: target.selector,
        style: {
          rotate: toPreviewRotate(angle, base),
          ...toMoveStyle(layout, index, turn),
        },
        type: "preview-style",
      });
    }
  }
};

const toClassesOf = async (
  options: Options,
  target: SelectionContext
): Promise<{
  readonly classes: readonly string[] | null;
  readonly isTailwind: boolean;
} | null> => {
  if (options.directionId === null || target.source === null) {
    return null;
  }

  try {
    const answer = await api.elementClasses(
      options.projectId,
      options.directionId,
      target.source
    );

    const isTailwind = answer.variants?.mode === "classes";

    if (answer.tailwind?.mode === "classes") {
      return { classes: answer.tailwind.classes, isTailwind };
    }

    return { classes: null, isTailwind };
  } catch {
    return null;
  }
};

const toLayoutOf = async (
  options: Options,
  targets: readonly SelectionContext[]
): Promise<RotateLayout | null> => {
  if (targets.length < 2) {
    return null;
  }

  const answers = await Promise.all(
    targets.map(async (target) => await toClassesOf(options, target))
  );

  if (answers.every((answer) => answer === null)) {
    return null;
  }

  const inputs: RotateLayerInput[] = targets.map((target, index) => ({
    classes: answers[index]?.classes ?? null,
    target,
  }));

  return toRotateLayout(
    inputs,
    answers.some((answer) => answer?.isTailwind ?? false)
  );
};

const trackLayout = async (
  pending: Promise<RotateLayout | null>,
  state: RotateMove
): Promise<void> => {
  state.layout = await pending;
};

const toLabel = (
  frame: RotateFrame,
  turned: { readonly angle: number; readonly isEach: boolean },
  event: PointerEvent
): RotateLabel => ({
  angle: turned.angle,
  isEach: turned.isEach,
  x: (event.clientX - frame.left) / frame.zoom,
  y: (event.clientY - frame.top) / frame.zoom,
});

interface RotateRun {
  readonly bases: readonly RotateBase[];
  readonly frame: RotateFrame;
  readonly session: RotateSession;
  readonly start: RotatePoint;
  readonly state: RotateMove;
  readonly targets: readonly SelectionContext[];
}

const moveRotate = (run: RotateRun, event: PointerEvent): void => {
  const point = { x: event.clientX, y: event.clientY };
  const { bases, frame, session, start, state } = run;

  if (!state.isMoved && !isRotateDrag(start, point)) {
    return;
  }

  state.isMoved = true;

  const delta =
    toPointerAngle(frame.center, point) - toPointerAngle(frame.center, start);

  const turned = toGroupAngles(bases, delta, event.shiftKey);
  state.angles = turned.angles;
  state.turn = turned.label;

  postPreview(run);
  session.label.set(
    toLabel(
      frame,
      { angle: turned.label, isEach: state.layout?.isEach ?? false },
      event
    )
  );
};

const isTurned = (run: RotateRun): boolean =>
  run.state.isMoved &&
  run.bases.some((base, index) => run.state.angles[index] !== base.start);

const listenRotate = (
  session: RotateSession,
  targets: readonly SelectionContext[],
  event: ReactPointerEvent<HTMLElement>
): void => {
  const handle = event.currentTarget;
  const abort = new AbortController();
  const { signal } = abort;
  const start = { x: event.clientX, y: event.clientY };
  const frame = toFrame(handle);
  const bases = targets.map((target) => toRotateBase(target));
  const angles = bases.map((base) => base.start);
  const state: RotateMove = { angles, isMoved: false, layout: null, turn: 0 };
  const run = { bases, frame, session, start, state, targets };
  const pending = toLayoutOf(session.live.current, targets);

  void trackLayout(pending, state);

  const end = (isCommitting: boolean): void => {
    abort.abort();
    session.label.set(null);
    document.body.classList.remove(ROTATING_CLASS);
    session.live.current.holdSwap?.(false, !isCommitting);
  };

  const cancel = (): void => {
    end(false);

    if (state.isMoved) {
      session.live.current.post({ type: "preview-reset" });
    }
  };

  const onUp = (): void => {
    if (!isTurned(run)) {
      cancel();

      return;
    }

    end(true);
    session.commit({
      angles: state.angles,
      layout: pending,
      options: session.live.current,
      targets: run.targets,
      turn: state.turn,
    });
  };

  const onEscape = (key: KeyboardEvent): void => {
    if (key.key === "Escape") {
      key.preventDefault();
      key.stopPropagation();
      cancel();
    }
  };

  const onMove = (move: PointerEvent): void => moveRotate(run, move);

  handle.addEventListener("pointermove", onMove, { signal });
  handle.addEventListener("pointerup", onUp, { signal });
  handle.addEventListener("pointercancel", cancel, { signal });
  globalThis.addEventListener("keydown", onEscape, { capture: true, signal });
};

const beginRotate = (
  session: RotateSession,
  targets: readonly SelectionContext[],
  event: ReactPointerEvent<HTMLElement>
): void => {
  const isSourced = targets.every((target) => target.source !== null);

  if (event.button !== 0 || targets.length === 0 || !isSourced) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.setPointerCapture(event.pointerId);
  document.body.classList.add(ROTATING_CLASS);
  session.live.current.holdSwap?.(true, false);
  listenRotate(session, targets, event);
};

const toOptimisticId = (): string => `rotate-${crypto.randomUUID()}`;

const toCommitStyles = (
  request: RotateRequest,
  layout: RotateLayout | null
): readonly RotateStyle[] =>
  request.targets.map((_target, index) => ({
    rotate: toRotateValue(request.angles[index] ?? 0),
    ...toMoveStyle(layout, index, request.turn),
  }));

const postOptimistic = (
  options: Options,
  targets: readonly SelectionContext[],
  styles: readonly RotateStyle[]
): readonly string[] =>
  targets.map((target, index) => {
    const id = toOptimisticId();

    options.post({
      id,
      patch: {
        selector: target.selector,
        style: styles[index] ?? {},
        trusted: true,
      },
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
        reason: rotateHandleCopy.failed,
        type: "optimistic-settle",
      });
    }
  }
};

const toVariantBody = <Body extends object>(
  body: Body,
  variant: string
): Body => {
  if (variant === "") {
    return body;
  }

  return { ...body, variant };
};

const toCommitBody = (
  ids: { readonly directionId: string; readonly projectId: string },
  request: RotateRequest,
  styles: readonly RotateStyle[],
  variant: string
): RotateBody | RotateBatchBody => {
  const edits = request.targets.map((target, index) =>
    toVariantBody(toRotateEdit(target, styles[index] ?? {}), variant)
  );

  const [first] = request.targets;

  if (edits.length === 1 && first) {
    return toVariantBody(
      toRotateBody(ids, first, {
        rotate: toRotateValue(request.angles[0] ?? 0),
      }),
      variant
    );
  }

  return toRotateBatch(ids, edits);
};

const useRotateCommit = (
  readVariant: () => string
): RotateSession["commit"] => {
  const { run } = useAction(directEditRoutes.applyDirectEdit);
  const [, startWork] = useTransition();

  return useCallback(
    (request: RotateRequest): void => {
      const { options, targets } = request;
      const { directionId } = options;
      const isSourced = targets.every((target) => target.source !== null);

      if (directionId === null || targets.length === 0 || !isSourced) {
        return;
      }

      startWork(async () => {
        const styles = toCommitStyles(request, await request.layout);
        const ids = postOptimistic(options, targets, styles);

        const result = await run(
          toCommitBody(
            { directionId, projectId: options.projectId },
            request,
            styles,
            readVariant()
          )
        );

        if (result === null) {
          postSettled(options, ids, false);
          options.onError(rotateHandleCopy.failed);

          return;
        }

        postSettled(options, ids, true);
        options.refreshRects();
      });
    },
    [readVariant, run]
  );
};

const useRotateDrag = (
  live: RefObject<Options>,
  targets: readonly SelectionContext[],
  readVariant: () => string
): RotateDrag => {
  const label = useMemo(() => createLiveStore<RotateLabel | null>(null), []);
  const commit = useRotateCommit(readVariant);

  const session = useMemo(
    () => ({ commit, label, live }),
    [commit, label, live]
  );

  const onRotateDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void =>
      beginRotate(session, targets, event),
    [session, targets]
  );

  return { label, onRotateDown };
};

export { toClassesOf, useRotateDrag };

export type { RotateDrag };
