import { useCallback, useState, useTransition } from "react";

import { clampRepeat, toggleStress } from "./content-model.js";
import type {
  ContentMode,
  ContentPreset,
  StressMode,
} from "./content-model.js";
import type { SelectionContext } from "./deps.js";
import { useApplyContent } from "./use-apply.js";
import { useResetContent } from "./use-reset.js";

interface ContentOptions {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
}

interface ContentView {
  readonly error: string | null;
  readonly handleApply: () => void;
  readonly handleMode: (picked: StressMode) => void;
  readonly handlePreset: (picked: ContentPreset) => void;
  readonly handleReset: () => void;
  readonly handleStep: (delta: number) => void;
  readonly isBusy: boolean;
  readonly canApply: boolean;
  readonly canReset: boolean;
  readonly mode: ContentMode;
  readonly preset: ContentPreset;
  readonly repeat: number;
}

const useContent = (options: ContentOptions): ContentView => {
  const { directionId, projectId, target } = options;
  const apply = useApplyContent();
  const [preset, setPreset] = useState<ContentPreset>("generic");
  const [mode, setMode] = useState<ContentMode>("sample");
  const [repeat, setRepeat] = useState(1);
  const [previous, setPrevious] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const { source } = target;

  const handleApply = useCallback(() => {
    if (source === null) {
      return;
    }

    const layer = { col: source.col, file: source.file, line: source.line };

    startSubmit(async () => {
      const result = await apply.run({
        directionId,
        layer,
        mode,
        preset,
        projectId,
        repeat,
      });

      if (result !== null) {
        setPrevious(result.previousVersionId);
      }
    });
  }, [apply, directionId, mode, preset, projectId, repeat, source]);

  const onReset = useCallback(() => setPrevious(null), []);

  const { handleReset, restore } = useResetContent({
    directionId,
    onReset,
    previous,
    projectId,
    startSubmit,
  });

  const handlePreset = useCallback((picked: ContentPreset) => {
    setPreset(picked);
    setMode("sample");
  }, []);

  const handleMode = useCallback((picked: StressMode) => {
    setMode((current) => toggleStress(current, picked));
  }, []);

  const handleStep = useCallback((delta: number) => {
    setRepeat((current) => clampRepeat(current + delta));
  }, []);

  const canApply = source !== null;
  const canReset = previous !== null;
  const error = apply.error?.message ?? restore.error?.message ?? null;
  const isBusy = isSubmitting || apply.pending || restore.pending;

  return {
    canApply,
    canReset,
    error,
    handleApply,
    handleMode,
    handlePreset,
    handleReset,
    handleStep,
    isBusy,
    mode,
    preset,
    repeat,
  };
};

export { useContent };

export type { ContentOptions, ContentView };
