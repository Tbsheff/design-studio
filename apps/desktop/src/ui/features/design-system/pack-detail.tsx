import type {
  DesignSystemCheckResult,
  PackDetail,
  PackSummary,
} from "@design-studio/contracts";
import { useModalDialog } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { packApi } from "../../platform/pack-api.js";
import { CheckSection } from "./check-section.js";
import { DetailBar } from "./detail-bar.js";
import { DetailHead } from "./detail-head.js";
import { DocSection } from "./doc-section.js";
import type { PackDetailActions } from "./pack-detail-actions.js";
import { PreviewSection } from "./preview-section.js";
import { useLoad } from "./use-load.js";
import { usePackDetailRun } from "./use-pack-detail-run.js";

const PackDetailDialog = ({
  actions,
  onClose,
  pack,
}: {
  actions: PackDetailActions;
  onClose: () => void;
  pack: PackSummary;
}): ReactElement => {
  const key = `${pack.id}:${pack.name}`;
  const readDetail = useCallback(() => packApi.getPack(pack.id), [pack.id]);
  const readCheck = useCallback(() => packApi.checkPack(pack.id), [pack.id]);
  const detail = useLoad<PackDetail>(readDetail, key);
  const check = useLoad<DesignSystemCheckResult>(readCheck, key);

  const state = usePackDetailRun();
  const { isBusy } = state;

  const dismiss = useCallback((): false | undefined => {
    if (isBusy) {
      return false;
    }

    onClose();
  }, [isBusy, onClose]);

  const dialog = useModalDialog(dismiss);

  return (
    <dialog
      ref={dialog.ref}
      className="modal lib-detail"
      aria-label={`${pack.name} design system`}
      onMouseDown={dialog.onMouseDown}
    >
      <DetailHead isBusy={state.isBusy} onClose={onClose} pack={pack} />
      <DetailBar actions={actions} pack={pack} state={state} />
      <div className="modal-body lib-detail-body" aria-busy={state.isBusy}>
        <PreviewSection detail={detail} pack={pack} />
        <CheckSection check={check} />
        <DocSection detail={detail} />
      </div>
    </dialog>
  );
};

export { PackDetailDialog };
