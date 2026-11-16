import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CodeBarActions } from "./code-bar-actions.js";
import { copy } from "./copy.js";
import { FileLockRow } from "./file-lock-row.js";
import { toFileLabel, toFileTip, toLockFile } from "./snippet-model.js";
import { SnippetView } from "./snippet-view.js";
import { useSnippet } from "./use-snippet.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext | null;
}

const InspectorCode = ({
  projectId,
  directionId,
  selection,
}: Props): ReactElement => {
  const snippet = useSnippet(projectId, directionId, selection);

  if (!selection) {
    return (
      <>
        <p className="ins-hint">{copy.selectAnElementOnThe}</p>
        <FileLockRow
          projectId={projectId}
          directionId={directionId}
          file={null}
        />
      </>
    );
  }

  return (
    <div className="ins-code">
      <div className="ins-code-bar">
        <span className="ins-code-file" data-tip={toFileTip(snippet)}>
          {toFileLabel(snippet)}
        </span>
        <CodeBarActions
          projectId={projectId}
          directionId={directionId}
          snippet={snippet}
        />
      </div>
      <SnippetView snippet={snippet} />
      <FileLockRow
        projectId={projectId}
        directionId={directionId}
        file={toLockFile(snippet)}
      />
    </div>
  );
};

export { InspectorCode };
