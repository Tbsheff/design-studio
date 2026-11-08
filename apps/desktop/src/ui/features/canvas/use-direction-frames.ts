import { BRIDGE_PASSIVE_PARAM } from "@design-studio/contracts";
import type { Direction, ProjectKind } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { api } from "../../api.js";
import { frameSrc } from "../../platform/bridge.js";
import { useTokenFrames } from "../design-system/token-frames.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { useSwapGate } from "../inspector/use-swap-gate.js";
import type { GateTarget } from "../inspector/use-swap-gate.js";
import { frameDirection } from "./canvas-direction-ops.js";
import { withFramePath } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { markOf, withElementMark } from "./element-mark-model.js";
import { frameStateUrl } from "./frame-states-model.js";
import type { FrameStatesRead } from "./frame-states-model.js";
import { passiveSrc } from "./use-canvas-frames.js";
import { useStableByKey } from "./use-stable-by-key.js";
import { useTokenCache } from "./use-token-cache.js";

interface PassiveSlot {
  id: string;
  directionId: string | null;
  token: string;
  src: string | null;
  nextSrc: string | null;
}

interface Options {
  projectId: string;
  kind: ProjectKind;
  frames: CanvasFrame[];
  activeId: string;
  currentId: string | null;
  currentUrl: string | null;
  live: boolean;
  lastChange: FilesChange | null;
  hold: boolean;
  directions: Direction[] | undefined;
  frameStates: FrameStatesRead;
}

type DirectionUrls = Map<string, string>;

interface DirectionUrlState {
  readonly projectId: string;
  readonly urls: DirectionUrls;
}

interface AskedIds {
  readonly projectId: string;
  readonly ids: Set<string>;
}

interface ResolvedFrame {
  readonly directionId: string | null;
  readonly frame: CanvasFrame;
}

interface TokenedFrame extends ResolvedFrame {
  readonly token: string;
}

interface DirectionFrames {
  readonly elements: RefObject<Record<string, HTMLIFrameElement | null>>;
  readonly onSwapDone: (key: string) => void;
  readonly slots: PassiveSlot[];
}

const NO_URLS: DirectionUrls = new Map();

const useDirectionUrls = (projectId: string, ids: string[]): DirectionUrls => {
  const [state, setState] = useState<DirectionUrlState>({
    projectId,
    urls: NO_URLS,
  });

  const asked = useRef<AskedIds>({ ids: new Set(), projectId });
  const key = ids.join(",");

  const fetchUrl = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { url } = await api.directionPreview(projectId, id);

        setState((prev) => {
          if (prev.projectId !== projectId) {
            return { projectId, urls: new Map([[id, url]]) };
          }

          return { projectId, urls: new Map(prev.urls).set(id, url) };
        });
      } catch {
        asked.current.ids.delete(id);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (asked.current.projectId !== projectId) {
      asked.current = { ids: new Set(), projectId };
    }

    const wanted = key.split(",").filter(Boolean);

    for (const id of wanted) {
      if (!asked.current.ids.has(id)) {
        asked.current.ids.add(id);
        void fetchUrl(id);
      }
    }
  }, [key, fetchUrl, projectId]);

  if (state.projectId === projectId) {
    return state.urls;
  }

  return NO_URLS;
};

const toDirectionId = (
  options: Options,
  known: Set<string>,
  frame: CanvasFrame
): string | null => {
  const own = frameDirection(frame, options.currentId);

  if (
    own &&
    (own === options.currentId || !options.directions || known.has(own))
  ) {
    return own;
  }

  return options.currentId;
};

const toResolvedFrames = (options: Options): ResolvedFrame[] => {
  const known = new Set(options.directions?.map((direction) => direction.id));
  const resolved: ResolvedFrame[] = [];

  for (const frame of options.frames) {
    if (frame.id !== options.activeId) {
      resolved.push({
        directionId: toDirectionId(options, known, frame),
        frame,
      });
    }
  }

  return resolved;
};

const toOtherDirectionIds = (
  resolved: ResolvedFrame[],
  currentId: string | null
): string[] => {
  const others = new Set<string>();

  for (const { directionId } of resolved) {
    if (directionId !== null && directionId !== currentId) {
      others.add(directionId);
    }
  }

  return [...others].toSorted();
};

const toGateTargets = (
  options: Options,
  resolved: ResolvedFrame[]
): GateTarget[] => {
  const heads = new Map(
    options.directions?.map((direction) => [
      direction.id,
      direction.headVersionId,
    ])
  );

  const targets: GateTarget[] = [];

  for (const { directionId, frame } of resolved) {
    if (
      directionId !== null &&
      (directionId !== options.currentId || options.live)
    ) {
      targets.push({
        directionId,
        headVersionId: heads.get(directionId) ?? null,
        key: frame.id,
      });
    }
  }

  return targets;
};

const toBaseUrl = (
  options: Options,
  urls: DirectionUrls,
  directionId: string | null
): string | null => {
  if (directionId === null) {
    return null;
  }

  if (directionId === options.currentId) {
    return options.currentUrl;
  }

  return withElementMark(
    urls.get(directionId) ?? null,
    markOf(options.directions, directionId)
  );
};

const toPassiveUrl = (
  options: Options,
  frame: CanvasFrame,
  base: string | null,
  change: FilesChange | null
): string | null => {
  if (!base) {
    return null;
  }

  const page = frameStateUrl(
    passiveSrc(withFramePath(base, frame.path), options.kind, change) as string,
    options.frameStates,
    frame.id
  );

  if (page) {
    return frameSrc(page, { [BRIDGE_PASSIVE_PARAM]: "1" });
  }

  return null;
};

const toGatedChange = (
  isGated: boolean,
  read: (frameId: string) => FilesChange | null,
  frameId: string
): FilesChange | null => {
  if (isGated) {
    return read(frameId);
  }

  return null;
};

const toPassiveSlot = (
  options: Options,
  urls: DirectionUrls,
  gate: ReturnType<typeof useSwapGate>,
  resolved: TokenedFrame
): PassiveSlot => {
  const { directionId, frame, token } = resolved;
  const isCurrent = directionId !== null && directionId === options.currentId;
  const base = toBaseUrl(options, urls, directionId);
  const isGated = !isCurrent || options.live;
  const shown = toGatedChange(isGated, gate.shownFor, frame.id);
  const next = toGatedChange(isGated, gate.nextFor, frame.id);
  const src = toPassiveUrl(options, frame, base, shown);
  let nextSrc: string | null = null;

  if (next) {
    nextSrc = toPassiveUrl(options, frame, base, next);
  }

  if (nextSrc === src) {
    nextSrc = null;
  }

  const { id } = frame;

  return { directionId, id, nextSrc, src, token };
};

const toGateHold = (options: Options): string | null => {
  if (options.live) {
    return options.currentId;
  }

  return null;
};

const toSlotKey = (slots: PassiveSlot[], currentId: string | null): string => {
  const parts: string[] = [];

  for (const slot of slots) {
    let part: string | null = "";

    if (slot.directionId === currentId) {
      part = slot.src;
    }

    parts.push(`${slot.id}:${part}`);
  }

  return parts.join("|");
};

const toTokenSlots = (
  slots: PassiveSlot[],
  currentId: string | null
): { src: string; token: string }[] => {
  const tokenSlots: { src: string; token: string }[] = [];

  for (const slot of slots) {
    if (slot.src && slot.directionId === currentId) {
      tokenSlots.push({ src: slot.src, token: slot.token });
    }
  }

  return tokenSlots;
};

const useDirectionFrames = (options: Options): DirectionFrames => {
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const toToken = useTokenCache();

  const resolved = toResolvedFrames(options);

  const urls = useDirectionUrls(
    options.projectId,
    toOtherDirectionIds(resolved, options.currentId)
  );

  const gate = useSwapGate({
    isHeld: options.hold,
    kind: options.kind,
    lastChange: options.lastChange,
    liveDirectionId: toGateHold(options),
    targets: toGateTargets(options, resolved),
  });

  const slots = resolved.map((item) =>
    toPassiveSlot(options, urls, gate, {
      ...item,
      token: toToken(item.frame.id),
    })
  );

  const tokenSlots = useStableByKey(
    toTokenSlots(slots, options.currentId),
    toSlotKey(slots, options.currentId)
  );

  useTokenFrames(tokenSlots, elements, options.kind, options.live);

  const { onSwapDone } = gate;

  return { elements, onSwapDone, slots };
};

export { useDirectionFrames };

export type { DirectionFrames, PassiveSlot };
