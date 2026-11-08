import type {
  EditorInfo,
  HandoffResult,
} from "@design-studio/contracts/export";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { EditorButton } from "./editor-button.js";
import type { ExportTarget } from "./export-api.js";
import { HandoffActions } from "./handoff-actions.js";

interface HandoffResultViewProps {
  readonly target: ExportTarget;
  readonly result: HandoffResult;
  readonly editors: readonly EditorInfo[];
  readonly onError: (text: string) => void;
}

const HandoffResultView = ({
  editors,
  onError,
  result,
  target,
}: HandoffResultViewProps): ReactElement => {
  const folder = result.path.split("/").pop() ?? "";
  const { directionId } = target;

  return (
    <div className="export-handoff-result">
      <div className="export-path" data-tip={result.path}>
        <Icon name="folder" size={14} />
        <span className="truncate">{`${uiCopy.handoffPathPrefix}${folder}`}</span>
      </div>
      <p className="export-sub">
        {`${result.files.length} ${uiCopy.handoffFilesNote}`}
      </p>
      <HandoffActions
        target={target}
        result={result}
        folder={folder}
        onError={onError}
      />
      {editors.length > 0 && directionId && (
        <div className="export-editors">
          <span className="export-label">{uiCopy.openProjectIn}</span>
          {editors.map((editor) => (
            <EditorButton
              key={editor.id}
              editor={editor}
              projectId={target.projectId}
              directionId={directionId}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { HandoffResultView };
