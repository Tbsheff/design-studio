import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { useNow } from "../../platform/clock.js";
import { canvasFrameName, framePage } from "../canvas/index.js";
import { toFrameLabels } from "./frame-labels.js";
import { PublishDoneNote } from "./publish-done-note.js";
import { PublishForm } from "./publish-form.js";
import { PublishPaneFoot } from "./publish-pane-foot.js";
import { PublishPlanView } from "./publish-plan-view.js";
import { PublishPublicationList } from "./publish-publication-list.js";
import { toFormError, toPlanInput } from "./publish-request.js";
import { PublishSetupBody } from "./publish-setup-body.js";
import { PublishSetupFold } from "./publish-setup-fold.js";
import type { PublishTarget } from "./publish-types.js";
import { usePublishBackend } from "./use-publish-backend.js";
import { usePublishCli } from "./use-publish-cli.js";
import { usePublishFlow } from "./use-publish-flow.js";
import { usePublishForm } from "./use-publish-form.js";

interface PublishPaneProps {
  readonly target: PublishTarget;
  readonly onClose: () => void;
}

const FRAME_NAMERS = { nameOf: canvasFrameName, pageOf: framePage };

const NOW_STEP_MS = 30_000;

const RECENT_REMOVED = 2;

const toShownPublications = (
  list: readonly Publication[]
): readonly Publication[] => [
  ...list.filter((entry) => entry.status !== "removed"),
  ...list
    .filter((entry) => entry.status === "removed")
    .slice(0, RECENT_REMOVED),
];

const PublishPane = ({ onClose, target }: PublishPaneProps): ReactElement => {
  const cli = usePublishCli();
  const backend = usePublishBackend();
  const flow = usePublishFlow(target);
  const { form, frames, onPatch, onToggle } = usePublishForm(target);
  const now = useNow(true, NOW_STEP_MS);

  const labels = useMemo(
    () => toFrameLabels(target.projectId, frames, FRAME_NAMERS),
    [target.projectId, frames]
  );

  const isReady = backend.backend?.ready === true;
  const problem = toFormError(target, form);
  const shown = toShownPublications(flow.pubs.list);
  const { check } = flow;

  const checkPlan = useCallback((): void => {
    check(toPlanInput(target, form));
  }, [check, target, form]);

  return (
    <>
      <div className="modal-body share-body publish-body">
        {!isReady && <PublishSetupBody state={cli} backend={backend} />}
        {isReady && !flow.plan && (
          <PublishSetupFold cli={cli} backend={backend} />
        )}
        {isReady && !flow.plan && (
          <PublishForm
            target={target}
            form={form}
            frames={frames}
            labels={labels}
            onPatch={onPatch}
            onToggle={onToggle}
          />
        )}
        {flow.plan && <PublishPlanView plan={flow.plan} />}
        {flow.done && !flow.plan && <PublishDoneNote done={flow.done} />}
        {(flow.failure ?? flow.pubs.backendError) && (
          <div className="alert error small" role="alert">
            {flow.failure ?? flow.pubs.backendError}
          </div>
        )}
        {shown.length > 0 && (
          <PublishPublicationList
            target={target}
            flow={flow}
            list={shown}
            now={now}
          />
        )}
      </div>
      <PublishPaneFoot
        flow={flow}
        isReady={isReady}
        problem={problem}
        onClose={onClose}
        onCheck={checkPlan}
      />
    </>
  );
};

export { PublishPane };

export type { PublishPaneProps, PublishTarget };
