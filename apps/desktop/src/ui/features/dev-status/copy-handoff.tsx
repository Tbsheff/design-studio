import { useCallback, useTransition } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { copyText } from "./deps.js";
import { toHandoffPrompt } from "./dev-status-model.js";
import type { StatusRow } from "./dev-status-model.js";
import type { DevStatusEntry } from "./dev-status-types.js";

import styles from "./dev-status.module.css";

interface CopyHandoffProps {
  readonly entry: DevStatusEntry;
  readonly projectId: string;
  readonly row: StatusRow;
}

const CopyHandoff = ({
  entry,
  projectId,
  row,
}: CopyHandoffProps): ReactElement | null => {
  const [isCopying, startCopy] = useTransition();

  const copyHandoff = useCallback((): void => {
    startCopy(async () => {
      await copyText(toHandoffPrompt(projectId, row, entry));
    });
  }, [entry, projectId, row]);

  if (entry.status !== "ready") {
    return null;
  }

  return (
    <button
      className={styles.copy}
      disabled={isCopying}
      onClick={copyHandoff}
      type="button"
    >
      {copy.copyHandoff}
    </button>
  );
};

export { CopyHandoff };
