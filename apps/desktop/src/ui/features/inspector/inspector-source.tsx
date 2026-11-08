import type { SourceLoc } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { startTransition, useState } from "react";

import { api, errorText } from "../../api.js";
import { copy } from "./copy.js";

const locText = (source: SourceLoc): string =>
  `${source.file}:${source.line}:${source.col}`;

const shortPath = (file: string): string => {
  const parts = file.split("/");

  return parts.length > 2 ? parts.slice(-2).join("/") : file;
};

const SourceLink = ({
  projectId,
  directionId,
  source,
}: {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly source: SourceLoc | null;
}): ReactElement => {
  const [note, setNote] = useState<string | null>(null);

  if (!source) {
    return <span className="ins-source" />;
  }

  const text = locText(source);

  const open = (): void => {
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
  };

  return (
    <>
      <button
        type="button"
        className="ins-source"
        data-tip={note ?? `${text}. Open in editor`}
        aria-label={`Open ${text} in the editor`}
        disabled={!directionId}
        onClick={open}
      >
        <span className="truncate">
          {shortPath(source.file)}
          {copy.text3}
          {source.line}
        </span>
        <Icon name="code" size={12} />
      </button>
      {note && (
        <span className="sr-only" role="status">
          {note}
        </span>
      )}
    </>
  );
};

export { locText, SourceLink };
