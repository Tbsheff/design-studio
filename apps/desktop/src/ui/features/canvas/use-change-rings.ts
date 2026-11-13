import { routes } from "@design-studio/actions/version/routes";
import type {
  SelectionContext,
  StudioEvent,
  ZoomKey,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { MutableRefObject } from "react";

import { errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { call } from "../../platform/http.js";
import type { RouteInput } from "../../platform/http.js";
import { useLatest } from "../../platform/use-latest.js";
import {
  DESCRIBE_TIMEOUT_MS,
  DESCRIBE_TRIES,
  DESCRIBE_WAIT_MS,
  ZOOM_WAIT_MS,
  isMostFound,
  toAnchorQueries,
  toNextStep,
  toRingAt,
  toRings,
  toSpot,
  toSpotTarget,
  toSpotWithout,
  toStepRing,
} from "./change-rings-model.js";
import type {
  ChangeItem,
  ChangeRing,
  ChangeSpot,
  SpotTarget,
} from "./change-rings-model.js";
import type { PreviewApi } from "./preview-frames-api.js";

type SpotFrames = Pick<PreviewApi, "listen" | "post">;

type SpotContexts = (SelectionContext | null)[];

type HunkRevertInput = RouteInput<typeof routes.applyHunkVersion>;

interface ChangeRingsInput {
  readonly directionId: string | null;
  readonly frames: SpotFrames;
  readonly projectId: string;
  readonly zoomKey: (key: ZoomKey) => void;
}

interface ChangeRings {
  readonly clear: () => void;
  readonly isPending: boolean;
  readonly message: string | null;
  readonly spot: ChangeSpot | null;
  readonly step: () => void;
  readonly undo: () => void;
}

interface SpotStore {
  readonly pair: string;
  readonly spot: ChangeSpot | null;
}

const ID_RADIX = 36;

const toRequestId = (): string => {
  const stamp = Date.now().toString(ID_RADIX);
  const salt = Math.random().toString(ID_RADIX).slice(2);

  return `change-${stamp}-${salt}`;
};

const waitFor = (ms: number): Promise<null> => {
  const { promise, resolve } = Promise.withResolvers<null>();
  globalThis.setTimeout(() => resolve(null), ms);

  return promise;
};

const describeOnce = async (
  frames: SpotFrames,
  items: readonly ChangeItem[]
): Promise<SpotContexts> => {
  const id = toRequestId();
  const { promise, resolve } = Promise.withResolvers<SpotContexts>();

  const stop = frames.listen((message) => {
    if (message.type === "anchor-contexts" && message.requestId === id) {
      resolve(message.contexts);
    }
  });

  const timer = globalThis.setTimeout(
    () => resolve(items.map(() => null)),
    DESCRIBE_TIMEOUT_MS
  );

  frames.post({
    anchors: toAnchorQueries(items),
    requestId: id,
    type: "describe-anchors",
  });

  const contexts = await promise;
  stop();
  globalThis.clearTimeout(timer);

  return contexts;
};

const describeRings = async (
  frames: SpotFrames,
  items: readonly ChangeItem[],
  triesLeft: number
): Promise<ChangeRing[]> => {
  await waitFor(DESCRIBE_WAIT_MS);

  const rings = toRings(items, await describeOnce(frames, items));

  if (isMostFound(rings) || triesLeft <= 1) {
    return rings;
  }

  return describeRings(frames, items, triesLeft - 1);
};

const loadSpot = async (
  input: ChangeRingsInput,
  target: SpotTarget
): Promise<ChangeSpot> => {
  const list = await call(routes.inspectChangesVersion, {
    directionId: target.directionId,
    from: null,
    projectId: input.projectId,
    to: target.versionId,
  });

  const rings = await describeRings(input.frames, list.items, DESCRIBE_TRIES);

  return toSpot(list, target, rings);
};

const toRevertInput = (
  forProject: string,
  spot: ChangeSpot,
  ring: ChangeRing
): HunkRevertInput => ({
  directionId: spot.directionId,
  file: ring.item.file,
  from: spot.from,
  hunk: ring.item.hunk,
  projectId: forProject,
  versionId: spot.to,
});

const focusRing = (
  ring: ChangeRing | null,
  post: SpotFrames["post"],
  zoomKey: ChangeRingsInput["zoomKey"]
): void => {
  if (!ring?.selector) {
    return;
  }

  post({ selector: ring.selector, type: "select-selector" });
  globalThis.setTimeout(() => zoomKey("selection"), ZOOM_WAIT_MS);
};

const toLiveTarget = (
  event: StudioEvent,
  live: MutableRefObject<ChangeRingsInput>,
  since: MutableRefObject<number>
): SpotTarget | null =>
  toSpotTarget(event, live.current.directionId, since.current);

const toPair = (input: ChangeRingsInput): string =>
  `${input.projectId}/${input.directionId ?? ""}`;

const toPairSpot = (store: SpotStore, pair: string): ChangeSpot | null => {
  if (store.pair === pair) {
    return store.spot;
  }

  return null;
};

const useMountTime = (): MutableRefObject<number> => {
  const since = useRef(0);

  useEffect(() => {
    since.current = Date.now();
  }, []);

  return since;
};

const useEscClear = (spot: ChangeSpot | null, clear: () => void): void => {
  useEffect(() => {
    if (!spot) {
      return;
    }

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        clear();
      }
    };

    globalThis.addEventListener("keydown", handleKey);

    return (): void => globalThis.removeEventListener("keydown", handleKey);
  }, [clear, spot]);
};

const useChangeRings = (input: ChangeRingsInput): ChangeRings => {
  const { projectId, zoomKey } = input;
  const { post } = input.frames;
  const pair = toPair(input);
  const latest = useLatest(input);
  const [store, setStore] = useState<SpotStore>({ pair, spot: null });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const since = useMountTime();
  const spot = toPairSpot(store, pair);

  useProjectEvents(projectId, (event: StudioEvent) => {
    const target = toLiveTarget(event, latest, since);

    if (!target) {
      return;
    }

    const at = toPair(latest.current);

    startTransition(async () => {
      try {
        const next = await loadSpot(latest.current, target);
        setStore({ pair: at, spot: next });
        setMessage(null);
      } catch (error) {
        setMessage(errorText(error));
      }
    });
  });

  const clear = useCallback((): void => {
    setStore({ pair, spot: null });
    setMessage(null);
  }, [pair, setMessage, setStore]);

  const step = useCallback((): void => {
    if (!spot) {
      return;
    }

    const next = toNextStep(spot);
    const ring = toRingAt(spot, next);

    setStore({ pair, spot: { ...spot, step: next } });
    focusRing(ring, post, zoomKey);
  }, [pair, post, setStore, spot, zoomKey]);

  const undo = useCallback((): void => {
    const ring = toStepRing(spot);

    if (!spot || !ring) {
      return;
    }

    startTransition(async () => {
      try {
        await call(
          routes.applyHunkVersion,
          toRevertInput(projectId, spot, ring)
        );
        setStore({ pair, spot: toSpotWithout(spot, ring) });
        setMessage(null);
      } catch (error) {
        setMessage(errorText(error));
      }
    });
  }, [pair, projectId, setMessage, setStore, spot, startTransition]);

  useEscClear(spot, clear);

  return { clear, isPending, message, spot, step, undo };
};

export { useChangeRings };

export type { ChangeRings, ChangeRingsInput };
