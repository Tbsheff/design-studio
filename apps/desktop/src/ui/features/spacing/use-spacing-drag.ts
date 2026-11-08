import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  api,
  createCurrentEditRequest,
  errorText,
  applyCommit,
  snapOff,
  startOptimistic,
} from "./deps.js";
import type {
  BridgeToParent,
  ParentMessageBody,
  SelectionContext,
  SpacingSetBody,
  SpacingStep,
} from "./deps.js";
import {
  baseStyleOf,
  committedStyle,
  dragValue,
  labelOf,
  modeOf,
  planOf,
  snapValue,
  styleOf,
  withSlots,
} from "./spacing-model.js";
import type {
  Band,
  DragPlan,
  SnapResult,
  SpacingValues,
  StyleMap,
} from "./spacing-model.js";

type EditStyle = Parameters<typeof createCurrentEditRequest>[1];

interface SpacingHost {
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly holdSwap?: (held: boolean, settle: boolean) => void;
  readonly listen?: (handler: (message: BridgeToParent) => void) => () => void;
  readonly onError: (message: string) => void;
  readonly post: (body: ParentMessageBody) => void;
  readonly projectId: string;
  readonly refreshRects: () => void;
  readonly setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
}

interface SpacingLive {
  readonly bandId: string;
  readonly label: string;
  readonly plan: DragPlan;
  readonly values: SpacingValues;
}

interface Drag {
  readonly band: Band;
  readonly base: SpacingValues;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly target: SelectionContext;
  readonly zoom: number;
  plan: DragPlan;
  result: SnapResult;
}

interface DragInput {
  readonly host: SpacingHost;
  readonly onSaved: () => void;
  readonly scale: readonly SpacingStep[];
  readonly target: SelectionContext | null;
  readonly values: SpacingValues;
  readonly zoom: number;
}

interface SpacingDrag {
  readonly live: SpacingLive | null;
  readonly onBandDown: (
    band: Band,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
}

const allSlots = (band: Band): DragPlan["slots"] =>
  planOf(band.slot, "all").slots;

const previewOf = (session: Drag, values: SpacingValues): StyleMap => ({
  ...baseStyleOf(allSlots(session.band), session.base),
  ...baseStyleOf(session.plan.slots, values),
});

const bodyOf = (session: Drag): SpacingSetBody => {
  const target = {
    selector: session.target.selector,
    source: session.target.source ?? { col: 1, file: "", line: 1 },
    tag: session.target.tag.toLowerCase(),
  };

  const { property, side } = session.plan;

  if (session.result.token === null) {
    return { spacing: { property, side, value: session.result.px }, target };
  }

  return { spacing: { property, side, token: session.result.token }, target };
};

const isChanged = (session: Drag): boolean =>
  session.plan.slots.some((slot) => session.base[slot] !== session.result.px);

const stepOf = (
  session: Drag,
  scale: readonly SpacingStep[],
  pointer: PointerEvent
): SpacingValues => {
  session.plan = planOf(session.band.slot, modeOf(pointer));

  const px = dragValue(
    session.band.slot,
    session.base[session.band.slot],
    (pointer.clientX - session.startX) / session.zoom,
    (pointer.clientY - session.startY) / session.zoom
  );

  session.result = snapValue(scale, px, snapOff(pointer));

  return withSlots(session.base, session.plan.slots, session.result.px);
};

interface DragEvents {
  readonly onCancel: () => void;
  readonly onEnd: (session: Drag) => Promise<void>;
  readonly onStep: (session: Drag, pointer: PointerEvent) => void;
}

const listenDrag = (
  handle: HTMLElement,
  session: Drag,
  events: DragEvents,
  current: () => Drag | null
): void => {
  const control = new AbortController();
  const { signal } = control;

  handle.addEventListener(
    "pointermove",
    (pointer) => {
      if (pointer.pointerId === session.pointerId && current() === session) {
        events.onStep(session, pointer);
      }
    },
    { signal }
  );

  handle.addEventListener(
    "pointerup",
    (pointer) => {
      if (pointer.pointerId !== session.pointerId) {
        return;
      }

      control.abort();

      if (current() === session) {
        void events.onEnd(session);
      }
    },
    { signal }
  );

  handle.addEventListener(
    "pointercancel",
    () => {
      control.abort();
      events.onCancel();
    },
    { signal }
  );

  globalThis.addEventListener(
    "keydown",
    (pointer) => {
      if (pointer.key !== "Escape") {
        return;
      }

      pointer.preventDefault();
      pointer.stopPropagation();
      control.abort();
      events.onCancel();
    },
    { capture: true, signal }
  );
};

const startDrag = (
  picked: Band,
  down: ReactPointerEvent<HTMLElement>,
  input: DragInput
): Drag | null => {
  const { target: element, values, zoom, host } = input;

  if (down.button !== 0 || !element?.source || !host.enabled) {
    return null;
  }

  down.preventDefault();
  down.stopPropagation();
  down.currentTarget.setPointerCapture(down.pointerId);

  return {
    band: picked,
    base: values,
    plan: planOf(picked.slot, modeOf(down)),
    pointerId: down.pointerId,
    result: { px: values[picked.slot], token: null },
    startX: down.clientX,
    startY: down.clientY,
    target: element,
    zoom: zoom || 1,
  };
};

const saveDrag = async (
  session: Drag,
  input: () => DragInput
): Promise<boolean> => {
  const { host } = input();
  const values = withSlots(session.base, session.plan.slots, session.result.px);

  const { selector } = session.target;
  const style = committedStyle(values, session.plan.property) as EditStyle;
  const back = committedStyle(session.base, session.plan.property) as EditStyle;

  const req = createCurrentEditRequest(
    session.target,
    styleOf(session.plan.slots, session.result.px) as EditStyle
  );

  if (!host.directionId || !req) {
    return false;
  }

  host.setSelection((prev) => applyCommit(prev, { selector, style }));

  const optimistic = startOptimistic(
    { post: host.post, refreshRects: host.refreshRects },
    req,
    (message) => input().host.onError(message)
  );

  try {
    await api.setSpacing(host.projectId, host.directionId, bodyOf(session));
    optimistic.saved(null);
    input().host.refreshRects();
    input().onSaved();

    return true;
  } catch (error) {
    optimistic.failed(errorText(error));
    input().host.setSelection((prev) =>
      applyCommit(prev, { selector, style: back })
    );
    input().host.onError(errorText(error));

    return false;
  }
};

const postPreview = (host: SpacingHost, session: Drag, css: StyleMap): void => {
  host.post({
    selector: session.target.selector,
    style: css,
    type: "preview-style",
  });
};

const restoreDrag = (host: SpacingHost, session: Drag): void => {
  postPreview(host, session, baseStyleOf(allSlots(session.band), session.base));
};

const useSpacingDrag = (input: DragInput): SpacingDrag => {
  const ref = useRef(input);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<SpacingLive | null>(null);

  useLayoutEffect(() => {
    ref.current = input;
  });

  const preview = useCallback((session: Drag, values: SpacingValues): void => {
    setLive({
      bandId: session.band.id,
      label: labelOf(session.result.px, session.result.token),
      plan: session.plan,
      values,
    });
    postPreview(ref.current.host, session, previewOf(session, values));
  }, []);

  const restore = useCallback((session: Drag): void => {
    restoreDrag(ref.current.host, session);
  }, []);

  const end = useCallback((committing: boolean): void => {
    drag.current = null;
    setLive(null);
    ref.current.host.holdSwap?.(false, !committing);
  }, []);

  const cancel = useCallback((): void => {
    const session = drag.current;

    if (session) {
      restore(session);
      end(false);
    }
  }, [end, restore]);

  const finish = useCallback(
    async (session: Drag): Promise<void> => {
      const changed = isChanged(session);

      end(changed);

      if (changed && !(await saveDrag(session, () => ref.current))) {
        restore(session);
      }
    },
    [end, restore]
  );

  const onBandDown = useCallback(
    (band: Band, down: ReactPointerEvent<HTMLElement>): void => {
      const session = startDrag(band, down, ref.current);

      if (!session) {
        return;
      }

      drag.current = session;
      ref.current.host.holdSwap?.(true, false);
      listenDrag(
        down.currentTarget,
        session,
        {
          onCancel: cancel,
          onEnd: finish,
          onStep: (step, pointer) =>
            preview(step, stepOf(step, ref.current.scale, pointer)),
        },
        () => drag.current
      );
    },
    [cancel, finish, preview]
  );

  useEffect(() => cancel, [cancel]);

  return { live, onBandDown };
};

export { useSpacingDrag };

export type { SpacingDrag, SpacingHost, SpacingLive };
