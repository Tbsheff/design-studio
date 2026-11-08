import { useCallback, useState } from "react";

import { toErrorsWith } from "./build-error-model.js";
import type { BuildError, NewBuildError } from "./build-error-model.js";
import { toBuildErrorsOnly } from "./studio-data-model.js";

interface BuildErrors {
  readonly errors: BuildError[];
  readonly addError: (entry: NewBuildError) => void;
  readonly clearErrors: () => void;
  readonly clearFrameErrors: () => void;
}

const useBuildErrors = (): BuildErrors => {
  const [errors, setErrors] = useState<BuildError[]>([]);

  const addError = useCallback((entry: NewBuildError): void => {
    setErrors((previous) => toErrorsWith(previous, entry, Date.now()));
  }, []);

  const clearErrors = useCallback((): void => setErrors([]), []);

  const clearFrameErrors = useCallback(
    (): void => setErrors((previous) => toBuildErrorsOnly(previous)),
    []
  );

  return { addError, clearErrors, clearFrameErrors, errors };
};

export { useBuildErrors };

export type { BuildErrors };
