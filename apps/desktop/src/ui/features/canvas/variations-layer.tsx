import type { Direction, Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { RunMap } from "../chat/run-state-model.js";
import { ElementVariantsDialog } from "../inspector/element-variants-dialog.js";
import { BriefCardLayer } from "./brief-card-layer.js";
import { restoreVariationFrames } from "./canvas-variations-model.js";
import { DraftStatus } from "./draft-status.js";
import { useElementAsk } from "./use-element-ask.js";
import { useShownGroup } from "./use-shown-group.js";
import type { VariationsState } from "./use-variations.js";
import { VariationBar } from "./variation-bar.js";
import { VariationNotice } from "./variation-notice.js";

interface TopProps {
  state: VariationsState;
  project: Project;
  direction: Direction | null;
  runs?: RunMap;
}

const VariationsTop = ({
  direction,
  project,
  runs,
  state,
}: TopProps): ReactElement => {
  const group = useShownGroup(project, state, direction);
  const { ask, draft, keepNotice, kept, keptLayout } = state;
  const { dismiss: onDismissDraft } = state;
  const { onCancel, onStart } = useElementAsk(state, project, ask);
  const onDismissKept = useCallback((): void => keepNotice(null), [keepNotice]);

  const onUndoKept = useCallback((): void => {
    if (keptLayout) {
      restoreVariationFrames(project.id, keptLayout);
    }

    keepNotice(null);
  }, [keepNotice, keptLayout, project.id]);

  let undoKept: (() => void) | null = null;

  if (keptLayout) {
    undoKept = onUndoKept;
  }

  return (
    <>
      {group.length > 0 && (
        <VariationBar
          direction={direction}
          group={group}
          project={project}
          runs={runs ?? null}
          state={state}
        />
      )}
      {kept && (
        <VariationNotice
          onDismiss={onDismissKept}
          onUndo={undoKept}
          testId="variation-kept"
          text={kept}
        />
      )}
      {ask && !draft && (
        <div className="variation-card-layer">
          <ElementVariantsDialog
            project={project}
            element={ask}
            onCancel={onCancel}
            onStart={onStart}
          />
        </div>
      )}
      {draft?.autoStart && (
        <DraftStatus draft={draft} onDismiss={onDismissDraft} />
      )}
      {draft && !draft.autoStart && (
        <BriefCardLayer draft={draft} state={state} />
      )}
    </>
  );
};

export { VariationsTop };
