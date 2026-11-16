import { useMemo } from "react";
import type { ReactElement } from "react";

import { pageName } from "../canvas/index.js";
import { canvasFrameChoices } from "../share-publish-ship-export/export-api.js";
import type { FrameChoice } from "../share-publish-ship-export/export-api.js";
import { COPY } from "./copy.js";
import { PortDialogBody } from "./port-dialog-body.js";
import { PortDialogHead } from "./port-dialog-head.js";
import { toPagePath } from "./port-model.js";
import type { PortTarget, PortFrameOption } from "./port-model.js";
import { useBackdropDialog } from "./use-backdrop-dialog.js";
import { usePortForm } from "./use-port-form.js";
import { usePortStart } from "./use-port-start.js";

type PortDialogTarget = PortTarget;

const toFrameOption = (choice: FrameChoice): PortFrameOption => ({
  id: choice.id,
  isActive: choice.active,
  label: `${choice.frame.name} · ${pageName(choice.frame.path)}`,
  path: toPagePath(choice.frame.path ?? null),
});

const PortToAppDialog = ({
  target,
  onClose,
}: {
  target: PortTarget;
  onClose: () => void;
}): ReactElement => {
  const ref = useBackdropDialog(onClose);
  const { directionId, projectId } = target;

  const frames = useMemo(
    () =>
      canvasFrameChoices(projectId, directionId).map((choice) =>
        toFrameOption(choice)
      ),
    [directionId, projectId]
  );

  const form = usePortForm(target, frames);
  const { failure, isBusy, started, submit } = usePortStart(target, form);

  const appName =
    form.targets.apps?.find((app) => app.id === form.chosenApp)?.name ??
    COPY.textTheApp;

  return (
    <dialog
      ref={ref}
      className="modal port-dialog"
      aria-label={COPY.labelMoveToApp}
    >
      <form className="modal-form" onSubmit={submit} noValidate>
        <PortDialogHead
          isMulti={form.pages.all.length > 1}
          onClose={onClose}
        />
        <PortDialogBody
          form={form}
          error={failure}
          isBusy={isBusy}
          started={started}
          appName={appName}
          onClose={onClose}
        />
      </form>
    </dialog>
  );
};

export { PortToAppDialog };

export type { PortDialogTarget };
