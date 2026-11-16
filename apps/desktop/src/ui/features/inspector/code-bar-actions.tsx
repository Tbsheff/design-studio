import type { ReactElement } from "react";

import { CodeEditButton } from "./code-edit-button.js";
import { CopySnippet } from "./copy-snippet.js";
import { OpenInEditor } from "./open-in-editor.js";
import type { Snippet } from "./snippet-model.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly snippet: Snippet;
}

const CodeBarActions = ({
  projectId,
  directionId,
  snippet,
}: Props): ReactElement => (
  <div className="ins-code-actions">
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
);

export { CodeBarActions };
