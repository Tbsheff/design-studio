import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toPromptText } from "./data-model-model.js";
import type { DataModelDetail } from "./data-model-model.js";
import { useCopyTs } from "./use-copy-ts.js";

import styles from "./data-model.module.css";

interface DialogFootProps {
  readonly detail: DataModelDetail | null;
  readonly onAdd: (text: string) => void;
  readonly variant: string;
}

const toCopyLabel = (state: "copied" | "failed" | "idle"): string => {
  if (state === "copied") {
    return copy.copied;
  }

  if (state === "failed") {
    return copy.copyFailed;
  }

  return copy.copyTs;
};

const DialogFoot = ({
  detail,
  onAdd,
  variant,
}: DialogFootProps): ReactElement => {
  const name = detail?.name ?? "";
  const copier = useCopyTs(`${name}:${variant}`, detail?.tsText ?? "");
  const isOff = detail === null;
  const { copy: handleCopy } = copier;

  const handleAdd = useCallback((): void => {
    onAdd(toPromptText(name));
  }, [name, onAdd]);

  return (
    <footer className={styles.foot}>
      <button
        type="button"
        className="btn small"
        disabled={isOff}
        onClick={handleCopy}
      >
        {toCopyLabel(copier.state)}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={isOff}
        onClick={handleAdd}
      >
        {copy.add}
      </button>
    </footer>
  );
};

export { DialogFoot };
