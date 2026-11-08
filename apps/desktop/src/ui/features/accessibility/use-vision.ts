import { useCallback, useState, useTransition } from "react";

import type { AccessibilityIds } from "./accessibility-api.js";
import { insertError } from "./deps.js";
import { runVision } from "./vision-api.js";
import type { VisionResult } from "./vision-api.js";
import { VISION_KINDS, toggleKind } from "./vision-model.js";
import type { VisionKind } from "./vision-model.js";

interface Vision {
  readonly error: string | null;
  readonly handleRun: () => void;
  readonly handleToggle: (kind: VisionKind) => void;
  readonly isPending: boolean;
  readonly kinds: readonly VisionKind[];
  readonly result: VisionResult | null;
}

const useVision = (ids: AccessibilityIds): Vision => {
  const [kinds, setKinds] = useState<readonly VisionKind[]>(VISION_KINDS);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = useCallback((kind: VisionKind): void => {
    setKinds((current) => toggleKind(current, kind));
  }, []);

  const handleRun = useCallback((): void => {
    startTransition(async () => {
      try {
        const next = await runVision(ids, kinds);
        setResult(next);
        setMessage(null);
      } catch (error) {
        setMessage(insertError(error));
      }
    });
  }, [ids, kinds]);

  return { error: message, handleRun, handleToggle, isPending, kinds, result };
};

export { useVision };

export type { Vision };
