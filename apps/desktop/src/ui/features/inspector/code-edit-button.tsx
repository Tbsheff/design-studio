import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { codeEditStore } from "./use-code-edit-target.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
}

const ICON_SIZE = 13;

const CodeEditButton = ({
  projectId,
  directionId,
  file,
  line,
}: Props): ReactElement => {
  const handleOpen = useCallback((): void => {
    codeEditStore.set({ directionId, file, line, projectId });
  }, [directionId, file, line, projectId]);

  return (
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
  );
};

export { CodeEditButton };
