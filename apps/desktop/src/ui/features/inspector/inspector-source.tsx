import { useState } from "react";

import type { SourceLoc } from "../../../shared/contracts.js";
import { api, errorText } from "../../api.js";
import { Icon } from "../../kit/Icon.js";

export const locText = (source: SourceLoc): string =>
  `${source.file}:${source.line}:${source.col}`;

const shortPath = (file: string): string => {
  const parts = file.split("/");

  return parts.length > 2 ? parts.slice(-2).join("/") : file;
};

export const SourceLink = ({
  projectId,
  directionId,
  source,
}: {
  projectId: string;
  directionId: string | null;
  source: SourceLoc | null;
}) => {
  const [note, setNote] = useState<string | null>(null);

  if (!source) {
    return <span className="ins-source" />;
  }

  const text = locText(source);

  const open = () => {
    if (!directionId) {
      return;
    }

    setNote(null);
    api
      .openSource(projectId, directionId, text)
      .then((result) => setNote(`Opened ${result.path}`))
      .catch((error: unknown) => setNote(errorText(error)));
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
          {shortPath(source.file)}:{source.line}
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
