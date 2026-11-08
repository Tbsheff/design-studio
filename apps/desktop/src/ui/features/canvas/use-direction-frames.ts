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

const useDirectionFrames = (o: Options) => {
  const tokens = useRef(new Map<string, string>());
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const passive = o.frames.filter((f) => f.id !== o.activeId);
  const known = new Set(o.directions?.map((d) => d.id));

  const resolved = passive.map((f) => {
    const own = frameDirection(f, o.currentId);

    return {
      directionId:
        own && (own === o.currentId || !o.directions || known.has(own))
          ? own
          : o.currentId,
      frame: f,
    };
  });

  const others = [
    ...new Set(
      resolved
        .map((r) => r.directionId)
        .filter((id): id is string => id !== null && id !== o.currentId)
    ),
  ].sort();

  const urls = useDirectionUrls(o.projectId, others);
  const heads = new Map(o.directions?.map((d) => [d.id, d.headVersionId]));

  const targets: GateTarget[] = resolved
    .filter(
      (r) => r.directionId !== null && (r.directionId !== o.currentId || o.live)
    )
    .map((r) => ({
      directionId: r.directionId as string,
      headVersionId: heads.get(r.directionId as string) ?? null,
      key: r.frame.id,
    }));

  const gate = useSwapGate(
    o.kind,
    targets,
    o.lastChange,
    o.hold,
    o.live ? o.currentId : null
  );

  const slots: PassiveSlot[] = resolved.map(({ frame, directionId }) => {
    const token = tokens.current.get(frame.id) ?? randomToken();
    tokens.current.set(frame.id, token);
    const isCurrent = directionId !== null && directionId === o.currentId;

    const base =
      directionId === null
        ? null
        : isCurrent
          ? o.currentUrl
          : withElementMark(
              urls[directionId] ?? null,
              markOf(o.directions, directionId)
            );

    const gated = !isCurrent || o.live;

    const build = (change: FilesChange | null): string | null => {
      const page = base
        ? frameStateUrl(
            passiveSrc(
              withFramePath(base, frame.path),
              o.kind,
              change
            ) as string,
            o.frameStates,
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
    .map((s) => `${s.id}:${s.directionId === o.currentId ? s.src : ""}`)
    .join("|");

  const tokenSlots = useMemo(
    () =>
      slots
        .filter((s) => s.src && s.directionId === o.currentId)
        .map((s) => ({ src: s.src as string, token: s.token })),
    [slotKey]
  );

  useTokenFrames(tokenSlots, elements, o.kind, o.live);

  return { elements, onSwapDone: gate.onSwapDone, slots };
};

type DirectionFrames = ReturnType<typeof useDirectionFrames>;

export { useDirectionFrames };

export type { DirectionFrames, PassiveSlot };
