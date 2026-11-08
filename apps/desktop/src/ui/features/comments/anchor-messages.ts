import type { BridgeToParent } from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { TrackInput } from "./comment-layer-types.js";
import { offsetIn } from "./comment-placement.js";
import type { AnchorQuery, AnchorReport, BridgeFrame } from "./deps.js";
import type { TrackRefs } from "./use-track-refs.js";

type SelectMessage = Extract<BridgeToParent, { type: "select" }>;

interface MessageContext {
  readonly live: MutableRefObject<TrackInput>;
  readonly onReports: (reports: AnchorReport[]) => void;
  readonly refs: TrackRefs;
  readonly track: (target: BridgeFrame | null, queries: AnchorQuery[]) => void;
}

const applySelect = (input: TrackInput, message: SelectMessage): void => {
  const { control, setPick } = input;
  const offset = offsetIn(message.selection.rect, message.point);
  const { repinId } = control;

  if (repinId) {
    control.repin(repinId, message.selection, offset);
    input.onExitCommentMode();

    return;
  }

  setPick(message.selection, offset);
};

const routeMessage = (
  context: MessageContext,
  source: BridgeFrame,
  message: BridgeToParent
): void => {
  const { live, refs } = context;

  if (message.type === "ready") {
    refs.readyTokens.current.add(source.token);
    context.track(source, live.current.queries);

    return;
  }

  if (source.token !== live.current.frames.frontToken) {
    return;
  }

  if (message.type === "anchor-rects") {
    context.onReports(message.anchors);

    return;
  }

  if (message.type === "anchor-contexts") {
    const resolve = refs.pending.current.get(message.requestId);
    refs.pending.current.delete(message.requestId);
    resolve?.(message.contexts);

    return;
  }

  if (message.type === "select" && live.current.commentMode) {
    applySelect(live.current, message);
  }
};

export { routeMessage };

export type { MessageContext, SelectMessage };
