import type { BridgeToParent } from "@design-studio/contracts";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";

import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { NO_SOURCE as noSource } from "../inspector/structure-edits.js";
import { insertBus } from "./component-insert-api.js";
import { toDropHint } from "./component-insert-hint.js";
import type { Options } from "./component-insert-model.js";
import { useInsertDrag, useInsertHost } from "./use-insert-host.js";
import type { InsertDrag } from "./use-insert-host.js";
import { useInsertRun } from "./use-insert-run.js";
import { useReselect } from "./use-reselect.js";

const FRAME_CHANGES = new Set(["painted", "ready", "tree"]);

const toBridgeFrames = (live: MutableRefObject<Options>): BridgeFrame[] =>
  live.current.frames.slots.map((slot): BridgeFrame => ({
    element: live.current.frames.elements.current[slot.token] ?? null,
    key: slot.token,
    kind: live.current.kind,
    token: slot.token,
    url: slot.src,
  }));

const applyElementAt = (
  drag: InsertDrag,
  msg: Extract<BridgeToParent, { type: "element-at" }>
): void => {
  const wait = drag.pending.current;

  if (!wait || wait.id !== msg.requestId) {
    return;
  }

  drag.drop.current = {
    inside: msg.inside,
    label: msg.label,
    requestId: msg.requestId,
    selection: msg.selection,
  };
  wait.onHint(toDropHint(drag.drop.current));
};

const useComponentInsert = (options: Options): void => {
  const live = useRef(options);

  useEffect(() => {
    live.current = options;
  });

  const drag = useInsertDrag();
  const { startReselect, tickReselect } = useReselect(live);
  const busy = useRef(false);

  const context = useMemo(
    () => ({ busy, live, noSource, startReselect }),
    [startReselect]
  );

  const run = useInsertRun(context);
  const host = useInsertHost(live, drag, run);

  useEffect(tickReselect, [options.selection, tickReselect]);

  useBridge(
    () => toBridgeFrames(live),
    (frame, msg: BridgeToParent) => {
      if (frame.token !== live.current.frames.frontToken) {
        return;
      }

      if (FRAME_CHANGES.has(msg.type)) {
        tickReselect();

        return;
      }

      if (msg.type === "element-at") {
        applyElementAt(drag, msg);
      }
    }
  );

  useEffect(() => {
    insertBus.set(host);

    return (): void => insertBus.clear(host);
  }, [host]);
};

export { useComponentInsert };
