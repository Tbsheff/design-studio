import type { ReactElement } from "react";

import { ChatPickBar } from "./chat-pick-bar.js";
import { CommentsComposer } from "./comments-composer.js";
import { toPanelGroups } from "./comments-panel-model.js";
import { CommentsPanelSections } from "./comments-panel-sections.js";
import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { PanelNotice } from "./panel-notice.js";
import { ResolvedFilter } from "./resolved-filter.js";
import type { CommentsControl } from "./use-comments.js";

interface Props {
  control: CommentsControl;
  running: boolean;
  onOpenRun: (runId: string) => void;
  onOpenVersion: (versionId: string) => void;
  selection?: SelectionContext[];
}

const NO_SELECTION: SelectionContext[] = [];

const CommentsPanel = ({
  control,
  running,
  onOpenRun,
  onOpenVersion,
  selection,
}: Props): ReactElement => {
  const groups = toPanelGroups(control.comments);

  return (
    <div className="comments-pane">
      <div className="comments-panel" data-testid="comments-panel">
        <PanelNotice control={control} />
        <ChatPickBar tone="" control={control} />
        {groups.isEmpty && (
          <p className="comments-empty">{copy.textNoCommentsYetPress}</p>
        )}
        <ResolvedFilter
          control={control}
          hiddenCount={groups.resolved.length}
        />
        <CommentsPanelSections
          control={control}
          isRunning={running}
          onOpenRun={onOpenRun}
          onOpenVersion={onOpenVersion}
        />
      </div>
      <CommentsComposer
        control={control}
        selection={selection ?? NO_SELECTION}
      />
    </div>
  );
};

export { CommentsPanel };
