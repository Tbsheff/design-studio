import type { EditorInfo } from "@design-studio/contracts/export";
import { Icon } from "@design-studio/ui";
import { startTransition, useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import { errorText } from "../../api.js";
import { copy } from "./copy.js";
import { exportApi } from "./deps.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly file: string;
}

const ICON_SIZE = 13;

const OpenInEditor = ({
  projectId,
  directionId,
  file,
}: Props): ReactElement | null => {
  const [editors, setEditors] = useState<EditorInfo[] | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const editor = editors?.[0] ?? null;

  useEffect(() => {
    startTransition(async () => {
      try {
        setEditors(await exportApi.editors());
      } catch {
        setEditors([]);
      }
    });
  }, []);

  const handleOpen = useCallback((): void => {
    if (!editor) {
      return;
    }

    setOpenError(null);

    startTransition(async () => {
      try {
        await exportApi.openInEditor(projectId, directionId, editor.id, file);
      } catch (error: unknown) {
        setOpenError(errorText(error));
      }
    });
  }, [directionId, editor, file, projectId]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="btn ghost small has-icon"
        data-tip={`Open ${file} in ${editor.name}`}
        data-tip-align="end"
        onClick={handleOpen}
      >
        <Icon name="file" size={ICON_SIZE} />
        {copy.openIn}
        {editor.name}
      </button>
      {openError && <span className="ins-code-error">{openError}</span>}
    </>
  );
};

export { OpenInEditor };
