import { useCallback, useEffect, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { api } from "./deps.js";
import type { CanvasFrame } from "./deps.js";
import { STEP_TIMES, isImportUrl, waitForFrame } from "./page-import-model.js";
import type { ImportStep } from "./page-import-model.js";

interface PageImportIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface PageImportState {
  readonly error: string | null;
  readonly isPending: boolean;
  readonly isUrlOk: boolean;
  readonly selector: string;
  readonly setSelector: (selector: string) => void;
  readonly setUrl: (url: string) => void;
  readonly setWidth: (width: number) => void;
  readonly startImport: () => void;
  readonly step: ImportStep;
  readonly url: string;
  readonly width: number;
}

const WIDTH_DEFAULT = 1440;

const useStepTimers = (
  isPending: boolean,
  setStep: (step: ImportStep) => void
): void => {
  useEffect(() => {
    if (!isPending) {
      return;
    }

    const timers = STEP_TIMES.map((entry) =>
      globalThis.setTimeout(() => setStep(entry.step), entry.at)
    );

    return (): void => {
      for (const timer of timers) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [isPending, setStep]);
};

const usePageImport = (
  ids: PageImportIds,
  onDone: (frame: CanvasFrame) => void
): PageImportState => {
  const [url, setUrl] = useState("");
  const [width, setWidth] = useState(WIDTH_DEFAULT);
  const [selector, setSelector] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [step, setStep] = useState<ImportStep>("loading");
  const [isPending, startTransition] = useTransition();
  const trimmed = url.trim();
  const isUrlOk = isImportUrl(trimmed);

  useStepTimers(isPending, setStep);

  const startImport = useCallback(() => {
    if (!isUrlOk) {
      return;
    }

    setProblem(null);
    setStep("loading");

    startTransition(async () => {
      try {
        const result = await api.importPage(ids.projectId, ids.directionId, {
          selector: selector.trim() || null,
          url: trimmed,
          width,
        });

        const frame = await waitForFrame(ids.projectId, result.frameId);

        if (!frame) {
          setProblem(copy.frameMissing);

          return;
        }

        onDone(frame);
      } catch (error) {
        if (error instanceof Error) {
          setProblem(error.message);

          return;
        }

        setProblem(String(error));
      }
    });
  }, [ids, isUrlOk, onDone, selector, trimmed, width]);

  return {
    error: problem,
    isPending,
    isUrlOk,
    selector,
    setSelector,
    setUrl,
    setWidth,
    startImport,
    step,
    url,
    width,
  };
};

export { usePageImport };

export type { PageImportIds, PageImportState };
