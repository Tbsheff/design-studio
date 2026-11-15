import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { badgeIdOf, badgesOf } from "./accessibility-model.js";
import type { BadgeStop } from "./accessibility-model.js";
import { postToFrame, useBridge } from "./deps.js";
import type {
  BridgeFrame,
  BridgeToParent,
  LinkQuery,
  LinkRectReport,
  ProjectKind,
} from "./deps.js";
import { useAccessibilityInfo } from "./use-accessibility-info.js";

interface TabOrderFrames {
  readonly elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  readonly frontToken: string | null;
  readonly slots: readonly { readonly src: string; readonly token: string }[];
}

interface TabOrderOptions {
  readonly directionId: string;
  readonly frameId: string;
  readonly frames: TabOrderFrames;
  readonly kind: ProjectKind;
  readonly projectId: string;
  readonly round: string;
}

type BadgeRect = NonNullable<LinkRectReport["rect"]>;

interface PlacedBadge extends BadgeStop {
  readonly rect: BadgeRect;
}

interface TabOrder {
  readonly badges: readonly PlacedBadge[];
  readonly error: string | null;
}

interface FrontSource {
  readonly frameId: string;
  readonly frames: TabOrderFrames;
  readonly kind: ProjectKind;
}

const TRACK = "track-links";

const frontOf = (source: FrontSource): BridgeFrame | null => {
  const front = source.frames.frontToken;

  const slot = source.frames.slots.find((item) => item.token === front) ?? null;

  if (front === null || slot === null) {
    return null;
  }

  return {
    element: source.frames.elements.current[front] ?? null,
    key: source.frameId,
    kind: source.kind,
    token: front,
    url: slot.src,
  };
};

const rectsOf = (
  message: Extract<BridgeToParent, { type: "link-rects" }>
): ReadonlyMap<string, BadgeRect> => {
  const rects = new Map<string, BadgeRect>();

  for (const report of message.links) {
    if (report.rect !== null) {
      rects.set(report.id, report.rect);
    }
  }

  return rects;
};

const placed = (
  stops: readonly BadgeStop[],
  rects: ReadonlyMap<string, BadgeRect>
): PlacedBadge[] =>
  stops.flatMap((stop) => {
    const rect = rects.get(badgeIdOf(stop.order)) ?? null;

    if (rect === null) {
      return [];
    }

    return [{ ...stop, rect }];
  });

const framesOf = (source: FrontSource): BridgeFrame[] => {
  const frame = frontOf(source);

  if (frame === null) {
    return [];
  }

  return [frame];
};

const useTabOrder = (options: TabOrderOptions): TabOrder => {
  const { directionId, frameId, frames, kind, projectId, round } = options;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const query = useMemo(
    () => ({
      colorScheme: null,
      frame: frameId,
      passing: false,
      selector: null,
    }),
    [frameId]
  );

  const source = useMemo(
    () => ({ frameId, frames, kind }),
    [frameId, frames, kind]
  );

  const load = useAccessibilityInfo(ids, query, round, true);
  const stops = useMemo(() => badgesOf(load.report), [load.report]);

  const queries = useMemo(
    (): LinkQuery[] =>
      stops.map((stop) => ({
        id: badgeIdOf(stop.order),
        selector: stop.selector,
      })),
    [stops]
  );

  const [rects, setRects] = useState<ReadonlyMap<string, BadgeRect>>(
    () => new Map()
  );

  const latest = useRef({ queries, source });

  useEffect(() => {
    latest.current = { queries, source };
  }, [queries, source]);

  useEffect(() => {
    const frame = frontOf(source);

    if (frame === null) {
      return;
    }

    postToFrame(frame, { links: queries, type: TRACK });

    return (): void => {
      postToFrame(frame, { links: [], type: TRACK });
    };
  }, [queries, source]);

  useBridge(
    () => framesOf(latest.current.source),
    (frame, message) => {
      if (message.type === "ready") {
        postToFrame(frame, { links: latest.current.queries, type: TRACK });

        return;
      }

      if (message.type === "link-rects") {
        setRects(rectsOf(message));
      }
    }
  );

  const badges = useMemo(() => placed(stops, rects), [rects, stops]);

  return { badges, error: load.error };
};

export { framesOf, frontOf, rectsOf, useTabOrder };

export type {
  BadgeRect,
  FrontSource,
  PlacedBadge,
  TabOrder,
  TabOrderFrames,
  TabOrderOptions,
};
