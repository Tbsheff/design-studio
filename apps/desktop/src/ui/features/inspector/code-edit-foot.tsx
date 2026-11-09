import type { ReactElement } from "react";

import { toSaveLabel } from "./code-edit-model.js";
import type { CodeEditStatus } from "./code-edit-model.js";
import { copy } from "./copy.js";

interface Props {
  readonly isPending: boolean;
  readonly status: CodeEditStatus;
  readonly onClose: () => void;
  readonly onReload: () => void;
  readonly onSave: () => void;
}

const CodeEditFoot = ({
  isPending,
  status,
  onClose,
  onReload,
  onSave,
}: Props): ReactElement => {
  const isConflict = status.kind === "conflict";
  const isReady = status.kind === "ready" || status.kind === "failed";

  return (
    <footer className="variation-card-foot code-edit-foot">
      {isConflict && (
        <p className="ins-error code-edit-note" role="alert">
          {copy.codeEditConflict}
        </p>
      )}
      {status.kind === "failed" && (
        <p className="ins-error code-edit-note" role="alert">
          {status.message}
        </p>
      )}
      {status.kind === "ready" && status.isSaved && (
        <p className="ins-note code-edit-note">{copy.codeEditSaved}</p>
      )}
      <button type="button" className="btn ghost small" onClick={onClose}>
        {copy.cancel}
      </button>
      {isConflict && (
        <button type="button" className="btn small" onClick={onReload}>
          {copy.codeEditReload}
        </button>
      )}
      <button
        type="button"
        className="btn primary small"
        disabled={!isReady || isPending}
        onClick={onSave}
      >
        {toSaveLabel(isPending)}
      </button>
    </footer>
  );
};

export { CodeEditFoot };
