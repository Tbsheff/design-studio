import { routes } from "@design-studio/actions/version/routes";
import type {
  SelectionContext,
  StudioEvent,
  ZoomKey,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { MutableRefObject, RefObject } from "react";

import { errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { ApiError, call } from "../../platform/http.js";
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
  toSpotStale,
  toSpotTarget,
  toSpotUndone,
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

type LayerRestoreInput = RouteInput<typeof routes.restoreChangeVersion>;

interface ChangeRingsInput {
  readonly directionId: string | null;
  readonly frames: SpotFrames;
  readonly projectId: string;
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly zoomKey: (key: ZoomKey) => void;
}

interface ChangeRings {
  readonly clear: () => void;
  readonly host: HTMLDivElement | null;
  readonly isPending: boolean;
  readonly message: string | null;
  readonly spot: ChangeSpot | null;
  readonly step: () => void;
  readonly undo: () => void;
}

interface SpotStore {
  readonly host: HTMLDivElement | null;
  readonly pair: string;
  readonly spot: ChangeSpot | null;
}

const ID_RADIX = 36;

const REFUSED_TAGS: ReadonlySet<string> = new Set([
  "BadRequest",
  "Conflict",
  "NotFound",
]);

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

const toRestoreInput = (
  forProject: string,
  spot: ChangeSpot,
  ring: ChangeRing
): LayerRestoreInput => ({
  directionId: spot.directionId,
  file: ring.item.file,
  kind: ring.item.kind,
  layerId: ring.item.layerId,
  projectId: forProject,
  versionId: spot.to,
});

const undoRing = async (
  forProject: string,
  spot: ChangeSpot,
  ring: ChangeRing
): Promise<ChangeSpot | null> => {
  if (ring.isStale) {
    await call(routes.applyHunkVersion, toRevertInput(forProject, spot, ring));

    return toSpotWithout(spot, ring);
  }

  await call(
    routes.restoreChangeVersion,
    toRestoreInput(forProject, spot, ring)
  );

  return toSpotUndone(spot, ring);
};

const focusRing = (
  ring: ChangeRing | null,
  post: SpotFrames["post"],
  zoomKey: ChangeRingsInput["zoomKey"]
): void => {
  if (!ring?.selector) {
    return;
  }

  post({
    sourceLoc: ring.item.layerId,
    tag: ring.item.tag,
    text: "",
    type: "select-source",
  });
  globalThis.setTimeout(() => zoomKey("selection"), ZOOM_WAIT_MS);
};

const toLiveTarget = (
  event: StudioEvent,
  live: MutableRefObject<ChangeRingsInput>,
  since: MutableRefObject<number>
): SpotTarget | null => {
  if (
    event.type === "version.created" &&
    (event.version.parentId ?? "") === ""
  ) {
    return null;
  }

  return toSpotTarget(event, live.current.directionId, since.current);
};

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

const toEmptyStore = (at: string): SpotStore => ({
  host: null,
  pair: at,
  spot: null,
});

const toSpotStore = (prev: SpotStore, next: ChangeSpot | null): SpotStore => ({
  ...prev,
  spot: next,
});

const useSpotEvents = (
  input: ChangeRingsInput,
  setStore: (store: SpotStore) => void,
  setMessage: (message: string | null) => void
): void => {
  const latest = useLatest(input);
  const since = useMountTime();
  const [, startTransition] = useTransition();

  useProjectEvents(input.projectId, (event: StudioEvent) => {
    const target = toLiveTarget(event, latest, since);

    if (!target) {
      return;
    }

    const at = toPair(latest.current);

    startTransition(async () => {
      try {
        const next = await loadSpot(latest.current, target);
        const host = latest.current.stageRef.current;
        setStore({ host, pair: at, spot: next });
        setMessage(null);
      } catch (error) {
        setMessage(errorText(error));
      }
    });
  });
};

const useChangeRings = (input: ChangeRingsInput): ChangeRings => {
  const { projectId, zoomKey } = input;
  const { post } = input.frames;
  const pair = toPair(input);
  const [store, setStore] = useState<SpotStore>(() => toEmptyStore(pair));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const spot = toPairSpot(store, pair);

  useSpotEvents(input, setStore, setMessage);

  const clear = useCallback((): void => {
    setStore(toEmptyStore(pair));
    setMessage(null);
  }, [pair, setMessage, setStore]);

  const step = useCallback((): void => {
    if (!spot) {
      return;
    }

    const next = toNextStep(spot);

    setStore(toSpotStore(store, { ...spot, step: next }));
    focusRing(toRingAt(spot, next), post, zoomKey);
  }, [post, setStore, spot, store, zoomKey]);

  const undo = useCallback((): void => {
    const ring = toStepRing(spot);

    if (!spot || !ring || ring.isUndone) {
      return;
    }

    startTransition(async () => {
      try {
        const next = await undoRing(projectId, spot, ring);
        setStore(toSpotStore(store, next));
        setMessage(null);
        focusRing(toStepRing(next), post, zoomKey);
      } catch (error) {
        if (error instanceof ApiError && REFUSED_TAGS.has(error.tag)) {
          setStore(toSpotStore(store, toSpotStale(spot, ring)));
        }

        setMessage(errorText(error));
      }
    });
  }, [
    post,
    projectId,
    setMessage,
    setStore,
    spot,
    startTransition,
    store,
    zoomKey,
  ]);

  useEscClear(spot, clear);

  const { host } = store;

  return { clear, host, isPending, message, spot, step, undo };
};

export { useChangeRings };

export type { ChangeRings, ChangeRingsInput };
