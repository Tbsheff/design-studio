import { useCallback } from "react";

import type { EntrancePreset } from "./deps.js";
import type { MotionDraft } from "./motion-model.js";

interface FieldHandlers {
  readonly handleDelay: (delayMs: number) => void;
  readonly handleDuration: (durationMs: number) => void;
  readonly handleEasing: (easing: string) => void;
  readonly handlePreset: (preset: EntrancePreset) => void;
  readonly handleStagger: (staggerMs: number) => void;
}

const useFieldHandlers = (
  draft: MotionDraft,
  onDraft: (next: MotionDraft) => void
): FieldHandlers => {
  const handlePreset = useCallback(
    (preset: EntrancePreset): void => {
      onDraft({ ...draft, preset });
    },
    [draft, onDraft]
  );

  const handleDuration = useCallback(
    (durationMs: number): void => {
      onDraft({ ...draft, durationMs });
    },
    [draft, onDraft]
  );

  const handleDelay = useCallback(
    (delayMs: number): void => {
      onDraft({ ...draft, delayMs });
    },
    [draft, onDraft]
  );

  const handleEasing = useCallback(
    (easing: string): void => {
      onDraft({ ...draft, easing });
    },
    [draft, onDraft]
  );

  const handleStagger = useCallback(
    (staggerMs: number): void => {
      onDraft({ ...draft, staggerMs });
    },
    [draft, onDraft]
  );

  return {
    handleDelay,
    handleDuration,
    handleEasing,
    handlePreset,
    handleStagger,
  };
};

export { useFieldHandlers };
