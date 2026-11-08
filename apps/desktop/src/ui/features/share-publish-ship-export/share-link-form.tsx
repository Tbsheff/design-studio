import { useCallback } from "react";
import type { ReactElement } from "react";

import { useNow } from "../../platform/clock.js";
import { copy } from "./copy.js";
import type { FrameLabel } from "./frame-label.js";
import { shareApi } from "./share-api.js";
import { ShareFormBody } from "./share-form-body.js";
import { ShareFormFoot } from "./share-form-foot.js";
import { ShareHead } from "./share-head.js";
import type { ShareMode } from "./share-mode.js";
import type { ShareCopied, ShareState } from "./share-types.js";
import { useShareForm } from "./use-share-form.js";
import type { ShareTargetInput } from "./use-share-form.js";

const NOW_STEP_MS = 30_000;

interface ShareLinkFormProps {
  readonly target: ShareTargetInput;
  readonly shares: ShareState;
  readonly copied: ShareCopied;
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly mode: ShareMode;
  readonly onMode: (mode: ShareMode) => void;
  readonly onClose: () => void;
}

const ShareLinkForm = ({
  copied,
  labels,
  mode,
  onClose,
  onMode,
  shares,
  target,
}: ShareLinkFormProps): ReactElement => {
  const form = useShareForm(target, shares, copied);
  const { projectId } = target;
  const { act } = shares;

  const now = useNow(true, NOW_STEP_MS);
  const { onSubmit } = form;

  const revokeLink = useCallback(
    (id: string): void => {
      void act(async () => {
        await shareApi.revoke(projectId, id);
      });
    },
    [act, projectId]
  );

  const setCursor = useCallback(
    (id: string, isOn: boolean): void => {
      void act(async () => {
        await shareApi.setStudioCursor(projectId, id, isOn);
      });
    },
    [act, projectId]
  );

  const setLan = useCallback(
    (isOn: boolean): void => {
      void act(async () => {
        await shareApi.setLan(isOn);
      });
    },
    [act]
  );

  return (
    <form className="modal-form" onSubmit={onSubmit} noValidate>
      <ShareHead
        title={copy.shareAReadOnly}
        subtitle={copy.viewersSeeImagesOf}
        mode={mode}
        onMode={onMode}
        onClose={onClose}
      />
      <ShareFormBody
        form={form}
        shares={shares}
        copied={copied}
        labels={labels}
        now={now}
        onRevoke={revokeLink}
        onCursor={setCursor}
        onLan={setLan}
      />
      <ShareFormFoot
        isBusy={shares.isBusy}
        canCreate={form.canCreate}
        onClose={onClose}
      />
    </form>
  );
};

export { ShareLinkForm };

export type { ShareLinkFormProps };
