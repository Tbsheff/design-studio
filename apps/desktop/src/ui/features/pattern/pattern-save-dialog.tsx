import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import type { PatternTarget, SaveTab } from "./pattern-model.js";
import { PatternSaveForm } from "./pattern-save-form.js";
import { PatternSaveTabs } from "./pattern-save-tabs.js";
import { PatternSiteForm } from "./pattern-site-form.js";

import styles from "./pattern.module.css";

interface PatternDialogProps {
  readonly directionId: string | null;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: PatternTarget | null;
}

const toFirstTab = (target: PatternTarget | null): SaveTab => {
  if (target === null) {
    return "site";
  }

  return "layer";
};

const PatternSaveDialog = ({
  directionId,
  onClose,
  onDone,
  projectId,
  target,
}: PatternDialogProps): ReactElement => {
  const [tab, setTab] = useState<SaveTab>(() => toFirstTab(target));

  const handleDismiss = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(handleDismiss);
  const hasLayer = target !== null && directionId !== null;

  return (
    <dialog
      aria-label={copy.title}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <PatternSaveTabs hasLayer={hasLayer} onSelect={setTab} tab={tab} />
      {tab === "layer" && hasLayer && (
        <PatternSaveForm
          directionId={directionId}
          onClose={onClose}
          onDone={onDone}
          projectId={projectId}
          target={target}
        />
      )}
      {(tab === "site" || !hasLayer) && (
        <PatternSiteForm
          onClose={onClose}
          onDone={onDone}
          projectId={projectId}
        />
      )}
    </dialog>
  );
};

export { PatternSaveDialog };

export type { PatternDialogProps };
