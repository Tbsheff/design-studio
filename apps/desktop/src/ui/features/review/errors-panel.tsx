import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import type { BuildError } from "../home/use-studio-data.js";
import { ErrorsChip } from "./errors-chip.js";
import { isDevNoiseError, toFixPrompt } from "./errors-model.js";
import { ErrorsOpenPanel } from "./errors-open-panel.js";

interface Props {
  errors: BuildError[];
  onSendToAgent: (buildError: BuildError) => void;
  onClear: () => void;
  pane?: string;
}

const isDevNoise = (buildError: BuildError): boolean =>
  isDevNoiseError(buildError);

const fixPrompt = (buildError: BuildError): string => toFixPrompt(buildError);

const ErrorsPanel = ({
  errors,
  onClear,
  onSendToAgent,
  pane,
}: Props): ReactElement | null => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (pane === "design") {
      setIsOpen(false);
    }
  }, [pane]);

  const open = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const shown = errors.filter((buildError) => !isDevNoise(buildError));

  if (shown.length === 0) {
    return null;
  }

  if (!isOpen) {
    return <ErrorsChip count={shown.length} onOpen={open} onClear={onClear} />;
  }

  return (
    <ErrorsOpenPanel
      shown={shown}
      onSend={onSendToAgent}
      onClose={close}
      onClear={onClear}
    />
  );
};

export { ErrorsPanel, fixPrompt, isDevNoise };
