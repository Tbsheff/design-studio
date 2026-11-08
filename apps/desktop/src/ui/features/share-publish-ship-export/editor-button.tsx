import type { EditorInfo } from "@design-studio/contracts/export";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toErrorText } from "./error-text.js";
import { exportApi } from "./export-api.js";

interface EditorButtonProps {
  readonly editor: EditorInfo;
  readonly projectId: string;
  readonly directionId: string;
  readonly onError: (text: string) => void;
}

const EditorButton = ({
  directionId,
  editor,
  onError,
  projectId,
}: EditorButtonProps): ReactElement => {
  const openEditor = useCallback(async (): Promise<void> => {
    try {
      await exportApi.openInEditor(projectId, directionId, editor.id);
    } catch (error) {
      onError(toErrorText(error as Error));
    }
  }, [directionId, editor.id, onError, projectId]);

  const open = useCallback((): void => {
    void openEditor();
  }, [openEditor]);

  return (
    <button type="button" className="btn small ghost" onClick={open}>
      {editor.name}
    </button>
  );
};

export { EditorButton };
