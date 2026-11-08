import { BRIDGE_PASSIVE_PARAM } from "@design-studio/contracts";
import type { Direction, ProjectKind } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    for (const id of key ? key.split(",") : []) {
      if (asked.current.has(id)) {
        continue;
      }

      asked.current.add(id);
      void fetchUrl(id);
    }
  }, [key, fetchUrl]);

  return urls;
};

const useDirectionFrames = (options: Options) => {
  const tokens = useRef(new Map<string, string>());
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});

  const passive = options.frames.filter(
    (canvasFrame) => canvasFrame.id !== options.activeId
  );

  const known = new Set(options.directions?.map((direction) => direction.id));

  const resolved = passive.map((canvasFrameValue) => {
    const own = frameDirection(canvasFrameValue, options.currentId);

    return {
      directionId:
        own &&
        (own === options.currentId || !options.directions || known.has(own))
          ? own
          : options.currentId,
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

  const gate = useSwapGate(
    options.kind,
    targets,
    options.lastChange,
    options.hold,
    options.live ? options.currentId : null
  );

  const slots: PassiveSlot[] = resolved.map(({ frame, directionId }) => {
    const token = tokens.current.get(frame.id) ?? randomToken();
    tokens.current.set(frame.id, token);
    const isCurrent = directionId !== null && directionId === options.currentId;

    const base =
      directionId === null
        ? null
        : isCurrent
          ? options.currentUrl
          : withElementMark(
              urls[directionId] ?? null,
              markOf(options.directions, directionId)
            );

    const gated = !isCurrent || options.live;

    const build = (change: FilesChange | null): string | null => {
      const page = base
        ? frameStateUrl(
            passiveSrc(
              withFramePath(base, frame.path),
              options.kind,
              change
            ) as string,
            options.frameStates,
            frame.id
          )
        : null;

      return page ? frameSrc(page, { [BRIDGE_PASSIVE_PARAM]: "1" }) : null;
    };

    const src = build(gated ? gate.shownFor(frame.id) : null);
    const next = gated ? gate.nextFor(frame.id) : null;
    const nextSrc = next ? build(next) : null;

    return {
      directionId,
      id: frame.id,
      nextSrc: nextSrc === src ? null : nextSrc,
      src,
      token,
    };
  });

  const slotKey = slots
    .map(
      (passiveSlot) =>
        `${passiveSlot.id}:${passiveSlot.directionId === options.currentId ? passiveSlot.src : ""}`
    )
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
