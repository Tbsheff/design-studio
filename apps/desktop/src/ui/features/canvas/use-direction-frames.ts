import { BRIDGE_PASSIVE_PARAM } from "@design-studio/contracts";
import type { Direction, ProjectKind } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { api } from "../../api.js";
import { frameSrc } from "../../platform/bridge.js";
import { randomToken } from "../../platform/session.js";
import { useTokenFrames } from "../design-system/token-frames.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { useSwapGate } from "../inspector/use-swap-gate.js";
import type { GateTarget } from "../inspector/use-swap-gate.js";
import { frameDirection, withFramePath } from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { markOf, withElementMark } from "./element-mark-model.js";
import { frameStateUrl } from "./frame-states-model.js";
import type { FrameStatesRead } from "./frame-states-model.js";
import { passiveSrc } from "./use-canvas-frames.js";

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

const useDirectionUrls = (
  projectId: string,
  ids: string[]
): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const asked = useRef(new Set<string>());
  const key = ids.join(",");
  useEffect(() => {
    asked.current = new Set();
    setUrls({});
  }, [projectId]);

  const fetchUrl = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { url } = await api.directionPreview(projectId, id);
        setUrls((prev) => ({ ...prev, [id]: url }));
      } catch {
        asked.current.delete(id);
      }
    },
    [projectId]
  );

  useEffect(() => {
    let result2: string[] = [];

    if (key) {
      result2 = key.split(",");
    }

    for (const id of result2) {
      if (asked.current.has(id)) {
        continue;
      }

      asked.current.add(id);
      void fetchUrl(id);
    }
  }, [key, fetchUrl]);

  return urls;
};

const useDirectionFrames = (
  options: Options
): {
  elements: RefObject<Record<string, HTMLIFrameElement | null>>;
  onSwapDone: (key: string) => void;
  slots: PassiveSlot[];
} => {
  const tokens = useRef(new Map<string, string>());
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});

  const passive = options.frames.filter(
    (canvasFrame) => canvasFrame.id !== options.activeId
  );

  const known = new Set(options.directions?.map((direction) => direction.id));

  const resolved = passive.map((canvasFrameValue) => {
    const own = frameDirection(canvasFrameValue, options.currentId);

    let directionId2: string | null = options.currentId;

    if (
      own &&
      (own === options.currentId || !options.directions || known.has(own))
    ) {
      directionId2 = own;
    }

    return {
      directionId: directionId2,
      frame: canvasFrameValue,
    };
  });

  const others = [
    ...new Set(
      resolved
        .map((result) => result.directionId)
        .filter((id): id is string => id !== null && id !== options.currentId)
    ),
  ].sort();

  const urls = useDirectionUrls(options.projectId, others);

  const heads = new Map(
    options.directions?.map((directionValue) => [
      directionValue.id,
      directionValue.headVersionId,
    ])
  );

  const targets: GateTarget[] = resolved
    .filter(
      (resultValue) =>
        resultValue.directionId !== null &&
        (resultValue.directionId !== options.currentId || options.live)
    )
    .map((result3) => ({
      directionId: result3.directionId as string,
      headVersionId: heads.get(result3.directionId as string) ?? null,
      key: result3.frame.id,
    }));

  let argument: string | null = null;

  if (options.live) {
    argument = options.currentId;
  }

  const gate = useSwapGate(
    options.kind,
    targets,
    options.lastChange,
    options.hold,
    argument
  );

  const slots: PassiveSlot[] = resolved.map(({ frame, directionId }) => {
    const token = tokens.current.get(frame.id) ?? randomToken();
    tokens.current.set(frame.id, token);
    const isCurrent = directionId !== null && directionId === options.currentId;

    const base: string | null = ((): string | null => {
      if (directionId === null) {
        return null;
      }
      if (isCurrent) {
        return options.currentUrl;
      }

      return withElementMark(
        urls[directionId] ?? null,
        markOf(options.directions, directionId)
      );
    })();

    const gated = !isCurrent || options.live;

    const build = (change: FilesChange | null): string | null => {
      let page: string | null = null;

      if (base) {
        page = frameStateUrl(
          passiveSrc(
            withFramePath(base, frame.path),
            options.kind,
            change
          ) as string,
          options.frameStates,
          frame.id
        );
      }

      if (page) {
        return frameSrc(page, { [BRIDGE_PASSIVE_PARAM]: "1" });
      }

      return null;
    };

    let argument2: FilesChange | null = null;

    if (gated) {
      argument2 = gate.shownFor(frame.id);
    }

    const src = build(argument2);

    let next: FilesChange | null = null;

    if (gated) {
      next = gate.nextFor(frame.id);
    }

    let nextSrc: string | null = null;

    if (next) {
      nextSrc = build(next);
    }

    let nextSrc2: string | null = nextSrc;

    if (nextSrc === src) {
      nextSrc2 = null;
    }

    return {
      directionId,
      id: frame.id,
      nextSrc: nextSrc2,
      src,
      token,
    };
  });

  const slotKey = slots
    .map((passiveSlot) => {
      let part: string | null = "";

      if (passiveSlot.directionId === options.currentId) {
        part = passiveSlot.src;
      }

      return `${passiveSlot.id}:${part}`;
    })
    .join("|");

  const tokenSlots = useMemo(
    () =>
      slots
        .filter(
          (passiveSlotValue) =>
            passiveSlotValue.src &&
            passiveSlotValue.directionId === options.currentId
        )
        .map((passiveSlot3) => ({
          src: passiveSlot3.src as string,
          token: passiveSlot3.token,
        })),
    [slotKey]
  );

  useTokenFrames(tokenSlots, elements, options.kind, options.live);

  return { elements, onSwapDone: gate.onSwapDone, slots };
};

type DirectionFrames = ReturnType<typeof useDirectionFrames>;

export { useDirectionFrames };

export type { DirectionFrames, PassiveSlot };
