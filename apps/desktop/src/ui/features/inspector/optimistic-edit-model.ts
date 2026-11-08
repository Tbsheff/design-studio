import type {
  BridgeToParent,
  DirectEditRequest,
  DomPatch,
  TailwindOutcome,
} from "@design-studio/contracts";

import type { PreviewPort } from "../../platform/bridge.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";

const RESULT_WAIT_MS = 30_000;
const SETTLE_TYPE = "optimistic-settle";
const ID_RADIX = 36;

interface OptimisticEdit {
  readonly saved: (tailwind: TailwindOutcome | null) => void;
  readonly failed: (reason: string) => void;
}

type PortMessage = Parameters<PreviewPort["post"]>[0];

let counter = 0;

const createId = (): string => {
  counter += 1;

  return `ui-${Date.now().toString(ID_RADIX)}-${counter}`;
};

const toStylePatch = (
  req: DirectEditRequest
): Record<string, string | null> | null => {
  if (!req.style || Object.keys(req.style).length === 0) {
    return null;
  }

  return req.style as Record<string, string | null>;
};

const toDomPatch = (req: DirectEditRequest): DomPatch | null => {
  if (
    req.variant ||
    Object.hasOwn(req, "move") ||
    Object.hasOwn(req, "insert")
  ) {
    return null;
  }

  const style = toStylePatch(req);
  const hasText = Object.hasOwn(req, "text");

  if (!style && !hasText) {
    return null;
  }

  const patch: DomPatch = { selector: req.selector, trusted: true };

  if (style) {
    patch.style = style;
  }

  if (hasText) {
    patch.text = req.text;
  }

  return patch;
};

const startResultWatch = (
  port: PreviewPort,
  id: string,
  onProblem: (reason: string) => void
): void => {
  if (!port.listen) {
    return;
  }

  const timer: TimerRef = { current: null };

  const stop = port.listen((message: BridgeToParent) => {
    if (message.type !== "optimistic-result" || message.id !== id) {
      return;
    }

    stop();
    stopTimer(timer);

    if (message.outcome === "mismatch" || message.outcome === "timeout") {
      onProblem(message.reason ?? "The page does not show the saved edit.");
    }
  });

  timer.current = globalThis.setTimeout(stop, RESULT_WAIT_MS);
};

const NOOP: OptimisticEdit = {
  failed: () => null,
  saved: () => null,
};

const toSavedMessage = (
  settleId: string,
  tailwind: TailwindOutcome | null
): PortMessage => {
  if (tailwind?.mode === "classes" && tailwind.delta) {
    return {
      classes: tailwind.delta,
      id: settleId,
      ok: true,
      type: SETTLE_TYPE,
    };
  }

  return { id: settleId, ok: true, type: SETTLE_TYPE };
};

const startOptimistic = (
  port: PreviewPort | null,
  req: DirectEditRequest,
  onProblem: (reason: string) => void
): OptimisticEdit => {
  const patch = toDomPatch(req);

  if (!port || !patch) {
    return NOOP;
  }

  const id = createId();
  port.post({ id, patch, type: "optimistic-apply", written: false });
  startResultWatch(port, id, onProblem);

  return {
    failed: (text) =>
      port.post({ id, ok: false, reason: text, type: SETTLE_TYPE }),
    saved: (tailwind) => port.post(toSavedMessage(id, tailwind)),
  };
};

export { startOptimistic, toDomPatch };

export type { OptimisticEdit };
