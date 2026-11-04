import { useCallback, useState, useTransition } from "react";

import { DEFAULT_WIDTHS, toggleWidth } from "./matrix-model.js";
import type { MatrixReportView, Scheme } from "./matrix-model.js";
import { useCreateMatrix } from "./use-create.js";
import { useRunMatrix } from "./use-run.js";
import type { RunInput } from "./use-run.js";

interface MatrixOptions {
  readonly directionId: string | null;
  readonly page: string;
  readonly projectId: string;
}

interface MatrixView {
  readonly canRun: boolean;
  readonly error: string | null;
  readonly handleCheck: () => void;
  readonly handleCreate: () => void;
  readonly handleScheme: (picked: Scheme) => void;
  readonly handleWidth: (picked: number) => void;
  readonly isBusy: boolean;
  readonly report: MatrixReportView | null;
  readonly scheme: Scheme;
  readonly widths: readonly number[];
}

const requestOf = (
  options: MatrixOptions,
  directionId: string,
  scheme: Scheme,
  chosen: readonly number[]
): RunInput => ({
  directionId,
  page: options.page,
  projectId: options.projectId,
  schemes: scheme,
  widths: chosen,
});

const useMatrix = (options: MatrixOptions): MatrixView => {
  const { directionId } = options;
  const create = useCreateMatrix();
  const [widths, setWidths] = useState<readonly number[]>(DEFAULT_WIDTHS);
  const [scheme, setScheme] = useState<Scheme>("both");
  const [report, setReport] = useState<MatrixReportView | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const runner = useRunMatrix();

  const handleCreate = useCallback(() => {
    if (directionId === null) {
      return;
    }

    const body = requestOf(options, directionId, scheme, widths);

    startSubmit(async () => {
      const created = await create.run(body);

      if (created === null) {
        return;
      }

      const checked = await runner.run(body);

      if (checked !== null) {
        setReport(checked);
      }
    });
  }, [create, directionId, options, runner, scheme, widths]);

  const handleCheck = useCallback(() => {
    if (directionId === null) {
      return;
    }

    const body = requestOf(options, directionId, scheme, widths);

    startSubmit(async () => {
      const checked = await runner.run(body);

      if (checked !== null) {
        setReport(checked);
      }
    });
  }, [directionId, options, runner, scheme, widths]);

  const handleWidth = useCallback((picked: number) => {
    setWidths((current) => toggleWidth(current, picked));
  }, []);

  const handleScheme = useCallback((picked: Scheme) => setScheme(picked), []);

  const error = create.error?.message ?? runner.error?.message ?? null;
  const isBusy = isSubmitting || create.pending || runner.pending;

  const canRun = directionId !== null;

  return {
    canRun,
    error,
    handleCheck,
    handleCreate,
    handleScheme,
    handleWidth,
    isBusy,
    report,
    scheme,
    widths,
  };
};

export { useMatrix };

export type { MatrixOptions, MatrixView };
