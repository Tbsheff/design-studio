import { useRef } from "react";
import type { MutableRefObject } from "react";

import { createOrphanTracker } from "./deps.js";
import type { OrphanTracker, SelectionContext } from "./deps.js";

type DescribeResolver = (contexts: (SelectionContext | null)[]) => void;

interface TrackedOrphans {
  readonly token: string | null;
  readonly tracker: OrphanTracker;
}

interface TrackRefs {
  readonly orphans: MutableRefObject<TrackedOrphans | null>;
  readonly pending: MutableRefObject<Map<string, DescribeResolver>>;
  readonly readyTokens: MutableRefObject<Set<string>>;
  readonly recheck: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  readonly retargeted: MutableRefObject<Map<string, string>>;
}

const useTrackRefs = (): TrackRefs => {
  const orphans = useRef<TrackedOrphans | null>(null);
  const pending = useRef(new Map<string, DescribeResolver>());
  const readyTokens = useRef(new Set<string>());
  const recheck = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retargeted = useRef(new Map<string, string>());

  return { orphans, pending, readyTokens, recheck, retargeted };
};

const toOrphans = (
  refs: TrackRefs,
  graceMs: number,
  token: string | null
): OrphanTracker => {
  const held = refs.orphans.current;

  if (held && held.token === token) {
    return held.tracker;
  }

  const tracker = createOrphanTracker(graceMs);
  refs.orphans.current = { token, tracker };

  return tracker;
};

export { toOrphans, useTrackRefs };

export type { DescribeResolver, TrackRefs };
