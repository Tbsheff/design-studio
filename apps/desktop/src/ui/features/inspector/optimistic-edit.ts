import type {
  BridgeToParent,
  DirectEditRequest,
  DomPatch,
  TailwindOutcome,
} from "@design-studio/contracts";

import type { PreviewPort } from "../../platform/bridge.js";

const RESULT_WAIT_MS = 30_000;

interface OptimisticEdit {
  readonly saved: (tailwind: TailwindOutcome | null | undefined) => void;
  readonly failed: (reason: string) => void;
}

let counter = 0;

const nextId = (): string => {
  counter += 1;

  return `ui-${Date.now().toString(36)}-${counter}`;
};

const domPatchFor = (req: DirectEditRequest): DomPatch | null => {
  if (req.variant || req.move !== undefined || req.insert !== undefined) {
    return null;
  }

  const style =
    req.style && Object.keys(req.style).length > 0
      ? (req.style as Record<string, string | null>)
      : undefined;

  if (!style && req.text === undefined) {
    return null;
  }

  return {
    selector: req.selector,
    trusted: true,
    ...(style ? { style } : {}),
    ...(req.text === undefined ? {} : { text: req.text }),
  };
};

const watchResult = (
  port: PreviewPort,
  id: string,
  onProblem: (reason: string) => void
): void => {
  if (!port.listen) {
    return;
  }

  const stop = port.listen((message: BridgeToParent) => {
    if (message.type !== "optimistic-result" || message.id !== id) {
      return;
    }

    stop();
    globalThis.clearTimeout(timer);

    if (message.outcome === "mismatch" || message.outcome === "timeout") {
      onProblem(message.reason ?? "The page does not show the saved edit.");
    }
  });

  const timer = globalThis.setTimeout(stop, RESULT_WAIT_MS);
};

const NOOP: OptimisticEdit = {
  failed: () => undefined,
  saved: () => undefined,
};

const startOptimistic = (
  port: PreviewPort | null | undefined,
  req: DirectEditRequest,
  onProblem: (reason: string) => void
): OptimisticEdit => {
  const patch = domPatchFor(req);

  if (!port || !patch) {
    return NOOP;
  }

  const id = nextId();
  port.post({ id, patch, type: "optimistic-apply", written: false });
  watchResult(port, id, onProblem);

  return {
    failed: (reason) =>
      port.post({ id, ok: false, reason, type: "optimistic-settle" }),
    saved: (tailwind) =>
      port.post({
        id,
        ok: true,
        type: "optimistic-settle",
        ...(tailwind?.mode === "classes" && tailwind.delta
          ? { classes: tailwind.delta }
          : {}),
      }),
  };
};

export { domPatchFor, startOptimistic };

export type { OptimisticEdit };
