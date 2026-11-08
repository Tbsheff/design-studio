import type { SourceLoc } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { startTransition, useCallback, useState } from "react";

import { api, errorText } from "../../api.js";
import { copy } from "./copy.js";
import { toLocText, toShortPath } from "./source-model.js";

interface SourceButtonProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly source: SourceLoc;
}

const SourceButton = ({
  projectId,
  directionId,
  source,
}: SourceButtonProps): ReactElement => {
  const [note, setNote] = useState<string | null>(null);
  const text = toLocText(source);

  const handleOpen = useCallback((): void => {
    if (!directionId) {
      return;
    }

    setNote(null);
    startTransition(async () => {
      try {
        const result = await api.openSource(projectId, directionId, text);
        setNote(`Opened ${result.path}`);
      } catch (error: unknown) {
        setNote(errorText(error));
      }
    });
  }, [projectId, directionId, text]);

  return (
    <>
      <button
        type="button"
        className="ins-source"
        data-tip={note ?? `${text}. Open in editor`}
        aria-label={`Open ${text} in the editor`}
        disabled={!directionId}
        onClick={handleOpen}
      >
        <span className="truncate">
          {toShortPath(source.file)}
          {copy.text3}
          {source.line}
        </span>
        <Icon name="code" size={12} />
      </button>
      {note && <output className="sr-only">{note}</output>}
    </>
  );
};

export { SourceButton };
