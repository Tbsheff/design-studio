import { Icon } from "@design-studio/ui";
import { Suspense, lazy, useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
}

const ICON_SIZE = 13;

const CodeEditDialog = lazy(async () => {
  const loaded = await import("./code-edit-dialog.js");

  return { default: loaded.CodeEditDialog };
});

const CodeEditButton = ({
  projectId,
  directionId,
  file,
  line,
}: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        className="btn ghost small has-icon"
        data-tip={copy.editFileTip}
        data-tip-align="end"
        data-testid="code-edit-button"
        onClick={handleOpen}
      >
        <Icon name="edit" size={ICON_SIZE} />
        {copy.editFile}
      </button>
      {isOpen && (
        <Suspense fallback={null}>
          <CodeEditDialog
            projectId={projectId}
            directionId={directionId}
            file={file}
            line={line}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </>
  );
};

export { CodeEditButton };
