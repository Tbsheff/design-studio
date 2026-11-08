import type { ReactElement } from "react";
import { useCallback } from "react";

import { ArrangeSlot } from "./arrange-slot.js";
import { copy } from "./copy.js";
import type { InspectorProps, InspectorTab } from "./inspector-model.js";
import { InspectorTabBody } from "./inspector-tab-body.js";
import { LeavePrompt } from "./leave-prompt.js";
import { SessionError } from "./session-error.js";
import { SessionHeader } from "./session-header.js";
import { TabBar } from "./tab-bar.js";
import { ToolsSlot } from "./tools-slot.js";
import type { EditSession } from "./use-edit-session.js";

interface Props {
  readonly props: InspectorProps;
  readonly session: EditSession;
  readonly tab: InspectorTab;
  readonly onTab: (tab: InspectorTab) => void;
}

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

  const isToolsShown = tab === "simple" || tab === "pro";

  return (
    <section className="edit-pane" aria-label={copy.editTitle}>
      <SessionHeader session={session} onDone={handleDone} />
      {session.error && !session.isAsking && (
        <SessionError message={session.error} onDismiss={handleDismiss} />
      )}
      <LeavePrompt session={session} />
      <TabBar tab={tab} onTab={onTab} />
      {isToolsShown && <ToolsSlot props={props} />}
      <ArrangeSlot props={props} shouldShowBar={tab === "simple"} />
      <InspectorTabBody props={props} session={session} tab={tab} />
    </section>
  );
};

export { InspectorEditPane };
