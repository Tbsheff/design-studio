import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CodeEditButton } from "./code-edit-button.js";
import { CopySnippet } from "./copy-snippet.js";
import { copy } from "./copy.js";
import { OpenInEditor } from "./open-in-editor.js";
import { toFileLabel, toFileTip } from "./snippet-model.js";
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
    return <p className="ins-hint">{copy.selectAnElementOnThe}</p>;
  }

  return (
    <div className="ins-code">
      <div className="ins-code-bar">
        <span className="ins-code-file" data-tip={toFileTip(snippet)}>
          {toFileLabel(snippet)}
        </span>
        {snippet.kind === "ready" && <CopySnippet code={snippet.code} />}
        {snippet.kind === "ready" && snippet.file && directionId && (
          <CodeEditButton
            projectId={projectId}
            directionId={directionId}
            file={snippet.file}
            line={snippet.line}
          />
        )}
        {snippet.kind === "ready" && snippet.file && directionId && (
          <OpenInEditor
            projectId={projectId}
            directionId={directionId}
            file={snippet.file}
          />
        )}
      </div>
      <SnippetView snippet={snippet} />
    </div>
  );
};

export { InspectorCode };
