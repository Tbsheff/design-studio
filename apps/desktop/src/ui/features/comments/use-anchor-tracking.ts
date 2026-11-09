import { useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";

import { toBridgeFrame, toBridgeFrames } from "./anchor-frames-model.js";
import { routeMessage } from "./anchor-messages.js";
import { reviewReports } from "./anchor-reports-model.js";
import type { Rect } from "./comment-layer-model.js";
import type { TrackInput } from "./comment-layer-types.js";
import type { DescribeAnchors } from "./comments-control.js";
import { postToFrame, useBridge } from "./deps.js";
import type {
  AnchorQuery,
  AnchorReport,
  BridgeFrame,
  SelectionContext,
} from "./deps.js";
import { useLatest, writeRef } from "./use-latest.js";
import { toOrphans, useTrackRefs } from "./use-track-refs.js";
import type { TrackRefs } from "./use-track-refs.js";

const ORPHAN_GRACE_MS = 1500;

const RECHECK_EXTRA_MS = 50;

const ID_RADIX = 36;

interface Reported {
  readonly rects: AnchorRects;
  readonly token: string | null;
}

type AnchorRects = ReadonlyMap<string, Rect>;

const EMPTY_RECTS: AnchorRects = new Map<string, Rect>();

const postTrack = (
  refs: TrackRefs,
  target: BridgeFrame | null,
  queries: AnchorQuery[]
): void => {
  if (target && refs.readyTokens.current.has(target.token)) {
    postToFrame(target, { anchors: queries, type: "track-anchors" });
  }
};

const toFrontFrame = (
  live: MutableRefObject<TrackInput>
): BridgeFrame | null => {
  const { frames, kind } = live.current;

  return toBridgeFrame(frames, kind, frames.frontToken);
};

const useDescribe = (input: TrackInput, refs: TrackRefs): void => {
  const { describeRef } = input.control;
  const live = useLatest(input);

  useEffect(() => {
    const describe: DescribeAnchors = (anchorList) => {
      const target = toFrontFrame(live);

      if (!target) {
        return Promise.resolve([]);
      }

      const requestId = Math.random().toString(ID_RADIX).slice(2);

      const { promise, resolve } =
        Promise.withResolvers<(SelectionContext | null)[]>();

      refs.pending.current.set(requestId, resolve);

      const anchors = anchorList;

      postToFrame(target, { anchors, requestId, type: "describe-anchors" });

      return promise;
    };

    writeRef(describeRef, describe);

    return (): void => writeRef(describeRef, null);
  }, [describeRef, live, refs]);
};

interface ReportContext {
  readonly live: MutableRefObject<TrackInput>;
  readonly refs: TrackRefs;
  readonly setReported: (reported: Reported) => void;
  readonly track: (target: BridgeFrame | null, queries: AnchorQuery[]) => void;
}

const toReported = (rects: AnchorRects, token: string | null): Reported => ({
  rects,
  token,
});

const applyReports = (
  context: ReportContext,
  reports: AnchorReport[]
): void => {
  const { live, refs, setReported, track } = context;
  const { current } = live;
  const { frontToken: token } = current.frames;

  const outcome = reviewReports(current.control.comments, reports, {
    now: Date.now(),
    orphans: toOrphans(refs, ORPHAN_GRACE_MS, token),
    retargeted: refs.retargeted.current,
  });

  for (const item of outcome.patches) {
    current.control.update(item.id, item.patch);
  }

  setReported(toReported(outcome.rects, token));

  if (outcome.isMissing && refs.recheck.current === null) {
    writeRef(
      refs.recheck,
      globalThis.setTimeout(() => {
        writeRef(refs.recheck, null);
        track(toFrontFrame(live), live.current.queries);
      }, ORPHAN_GRACE_MS + RECHECK_EXTRA_MS)
    );
  }
};

const useAnchorTracking = (input: TrackInput): AnchorRects => {
  const { frames, kind, queries } = input;
  const { frontToken } = frames;
  const refs = useTrackRefs();
  const live = useLatest(input);

  const [reported, setReported] = useState<Reported>(() =>
    toReported(EMPTY_RECTS, frontToken)
  );

  const track = useCallback(
    (target: BridgeFrame | null, anchors: AnchorQuery[]): void =>
      postTrack(refs, target, anchors),
    [refs]
  );

  const { isFrameReady } = input;

  useEffect(() => {
    if (isFrameReady && frontToken) {
      refs.readyTokens.current.add(frontToken);
    }

    track(toBridgeFrame(frames, kind, frontToken), queries);
  }, [queries, frames, kind, frontToken, isFrameReady, refs, track]);

  useEffect(
    () => (): void => {
      if (refs.recheck.current !== null) {
        globalThis.clearTimeout(refs.recheck.current);
      }
    },
    [refs]
  );

  const onReports = useCallback(
    (reports: AnchorReport[]): void =>
      applyReports({ live, refs, setReported, track }, reports),
    [live, refs, track]
  );

  useBridge(
    () => toBridgeFrames(live.current.frames, live.current.kind),
    (source, message) =>
      routeMessage({ live, onReports, refs, track }, source, message)
  );

  useDescribe(input, refs);

  if (reported.token !== frontToken) {
    return EMPTY_RECTS;
  }

  return reported.rects;
};

export { useAnchorTracking };

export type { AnchorRects };
