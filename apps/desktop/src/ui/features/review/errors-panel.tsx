import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { BuildError } from "../home/use-studio-data.js";
import { ErrorsChip } from "./errors-chip.js";
import { isDevNoiseError } from "./errors-model.js";
import { ErrorsOpenPanel } from "./errors-open-panel.js";

interface Props {
  errors: BuildError[];
  onSendToAgent: (buildError: BuildError) => void;
  onClear: () => void;
  pane?: string;
}

const ErrorsPanel = ({
  errors,
  onClear,
  onSendToAgent,
  pane,
}: Props): ReactElement | null => {
  const [panel, setPanel] = useState({ isOpen: false, pane });

  if (panel.pane !== pane) {
    setPanel({ isOpen: panel.isOpen && pane !== "design", pane });
  }

  const open = useCallback((): void => {
    setPanel((current) => ({ ...current, isOpen: true }));
  }, []);

  const close = useCallback((): void => {
    setPanel((current) => ({ ...current, isOpen: false }));
  }, []);

  const shown = useMemo(
    () => errors.filter((buildError) => !isDevNoiseError(buildError)),
    [errors]
  );

  if (shown.length === 0) {
    return null;
  }

  if (!panel.isOpen) {
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

export { ErrorsPanel };
