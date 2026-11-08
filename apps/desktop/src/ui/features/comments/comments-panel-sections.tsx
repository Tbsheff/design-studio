import type { ReactElement } from "react";

import { toPanelGroups, toResolvedCount } from "./comments-panel-model.js";
import { copy } from "./copy.js";
import { DoneSection } from "./done-section.js";
import { OrphanSection } from "./orphan-section.js";
import { QueuedSection } from "./queued-section.js";
import { RunningHint } from "./running-hint.js";
import type { CommentsControl } from "./use-comments.js";

const CommentsPanelSections = ({
  control,
  isRunning,
  onOpenRun,
  onOpenVersion,
}: {
  control: CommentsControl;
  isRunning: boolean;
  onOpenRun: (runId: string) => void;
  onOpenVersion: (versionId: string) => void;
}): ReactElement => {
  const groups = toPanelGroups(control.comments);
  const { inChat, queued, showResolved } = control;

  return (
    <>
      <DoneSection
        title={copy.fromViewers}
        comments={groups.viewers}
        count={groups.viewers.length}
        control={control}
        onOpenRun={onOpenRun}
        onOpenVersion={onOpenVersion}
      />
      <DoneSection
        title={copy.fromOutside}
        comments={groups.outside}
        count={groups.outside.length}
        control={control}
        onOpenRun={onOpenRun}
        onOpenVersion={onOpenVersion}
      />
      <QueuedSection title={copy.queued} comments={queued} control={control} />
      <QueuedSection title={copy.inChat} comments={inChat} control={control} />
      <RunningHint isShown={isRunning && queued.length > 0} />
      <DoneSection
        title={copy.sent}
        comments={groups.sent}
        count={groups.sent.length}
        control={control}
        onOpenRun={onOpenRun}
        onOpenVersion={onOpenVersion}
      />
      <OrphanSection
        title={copy.orphaned}
        comments={groups.orphaned}
        control={control}
      />
      <DoneSection
        title={copy.resolved}
        comments={groups.resolved}
        count={toResolvedCount(showResolved, groups.resolved.length)}
        control={control}
        onOpenRun={onOpenRun}
        onOpenVersion={onOpenVersion}
      />
    </>
  );
};

export { CommentsPanelSections };
