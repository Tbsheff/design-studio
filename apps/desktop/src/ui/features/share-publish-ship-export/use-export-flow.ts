import { useCallback, useState } from "react";

type FlowVideoFormat = "gif" | "mp4" | "webm";

interface ExportFlow {
  readonly maxSteps: number;
  readonly stepMs: number;
  readonly videoFormat: FlowVideoFormat;
  readonly handleSteps: (next: number) => void;
  readonly handleStepMs: (next: number) => void;
  readonly handleVideoFormat: (next: FlowVideoFormat) => void;
}

const STEPS_SHORT = 3;
const STEPS_FEW = 5;
const DEFAULT_STEPS = 8;
const STEPS_MANY = 12;
const STEPS_MAX = 20;

const STEP_COUNTS: readonly number[] = [
  STEPS_SHORT,
  STEPS_FEW,
  DEFAULT_STEPS,
  STEPS_MANY,
  STEPS_MAX,
];

const MS_FAST = 800;
const DEFAULT_STEP_MS = 1200;
const MS_SLOW = 2000;
const MS_SLOWEST = 3000;

const STEP_TIMES: readonly number[] = [
  MS_FAST,
  DEFAULT_STEP_MS,
  MS_SLOW,
  MS_SLOWEST,
];

const useExportFlow = (): ExportFlow => {
  const [videoFormat, setVideoFormat] = useState<FlowVideoFormat>("webm");
  const [maxSteps, setMaxSteps] = useState<number>(DEFAULT_STEPS);
  const [stepMs, setStepMs] = useState<number>(DEFAULT_STEP_MS);

  const handleVideoFormat = useCallback((next: FlowVideoFormat): void => {
    setVideoFormat(next);
  }, []);

  const handleSteps = useCallback((next: number): void => {
    setMaxSteps(next);
  }, []);

  const handleStepMs = useCallback((next: number): void => {
    setStepMs(next);
  }, []);

  return {
    handleStepMs,
    handleSteps,
    handleVideoFormat,
    maxSteps,
    stepMs,
    videoFormat,
  };
};

export { STEP_COUNTS, STEP_TIMES, useExportFlow };

export type { ExportFlow, FlowVideoFormat };
