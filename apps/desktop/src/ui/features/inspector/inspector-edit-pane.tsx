import type { ReactElement } from "react";
import { useCallback } from "react";

import { ArrangeSlot } from "./arrange-slot.js";
import { copy } from "./copy.js";
import type { InspectorProps, InspectorTab } from "./inspector-model.js";
import { InspectorTabBody } from "./inspector-tab-body.js";
import { LeavePrompt } from "./leave-prompt.js";
import { RuleProposalCard } from "./rule-proposal-card.js";
import { SessionError } from "./session-error.js";
import { SessionHeader } from "./session-header.js";
import { SharedLayersChip } from "./shared-layers-chip.js";
import { TabBar } from "./tab-bar.js";
import type { EditSession } from "./use-edit-session.js";

interface Props {
  readonly props: InspectorProps;
  readonly session: EditSession;
  readonly tab: InspectorTab;
  readonly onTab: (tab: InspectorTab) => void;
}

const isSessionShown = (session: EditSession): boolean =>
  session.count > 0 || session.busy !== null;

const InspectorEditPane = ({
  props,
  session,
  tab,
  onTab,
}: Props): ReactElement => {
  const { onExit } = props;
  const { clearError: handleDismiss } = session;

  const handleDone = useCallback((): void => {
    onExit?.();
  }, [onExit]);

  return (
    <section className="edit-pane" aria-label={copy.editTitle}>
      <TabBar tab={tab} onTab={onTab} isAppProject={Boolean(props.appDir)} />
      {isSessionShown(session) && (
        <SessionHeader session={session} onDone={handleDone} />
      )}
      <SharedLayersChip
        directionId={props.directionId}
        editCount={session.count}
        projectId={props.projectId}
        selection={props.selection}
      />
      {session.error && !session.isAsking && (
        <SessionError message={session.error} onDismiss={handleDismiss} />
      )}
      <LeavePrompt session={session} />
      <ArrangeSlot props={props} shouldShowBar={tab === "simple"} />
      <InspectorTabBody props={props} session={session} tab={tab} />
      <RuleProposalCard
        directionId={props.directionId}
        projectId={props.projectId}
      />
    </section>
  );
};

export { InspectorEditPane };
