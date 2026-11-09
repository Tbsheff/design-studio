import { useCallback } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import { CodeEditBody } from "./code-edit-body.js";
import { CodeEditFoot } from "./code-edit-foot.js";
import { CodeEditHead } from "./code-edit-head.js";
import { useCodeEdit } from "./use-code-edit.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly onClose: () => void;
}

const CodeEditDialog = ({
  projectId,
  directionId,
  file,
  line,
  onClose,
}: Props): ReactElement | null => {
  const body = useDocumentBody();
  const edit = useCodeEdit(projectId, directionId, file);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDialogElement>): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  if (!body) {
    return null;
  }

  const dialog = (
    <dialog
      open
      className="variation-card code-edit"
      aria-modal="false"
      aria-labelledby="code-edit-title"
      data-testid="code-edit-dialog"
      onKeyDown={handleKeyDown}
    >
      <CodeEditHead file={file} line={line} onClose={onClose} />
      <div className="code-edit-body">
        <CodeEditBody edit={edit} file={file} line={line} />
      </div>
      <CodeEditFoot
        isPending={edit.isPending}
        status={edit.status}
        onClose={onClose}
        onReload={edit.handleReload}
        onSave={edit.handleSave}
      />
    </dialog>
  );

  return <>{createPortal(dialog, body)}</>;
};

export { CodeEditDialog };
