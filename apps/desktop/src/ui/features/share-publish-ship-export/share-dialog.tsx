import { useModalDialog } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import type { PublishKind } from "../../../shared/publish.js";
import { useBackdropDismiss } from "../../platform/use-backdrop-dismiss.js";
import { canvasFrameName, framePage } from "../canvas/index.js";
import { copy } from "./copy.js";
import { LinkShare } from "./link-share.js";
import { pick } from "./pick.js";
import { PublishPane } from "./publish-pane.js";
import { ShareHead } from "./share-head.js";
import type { ShareMode } from "./share-mode.js";

const FRAME_NAMERS = { nameOf: canvasFrameName, pageOf: framePage };

interface ShareTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
  kind: PublishKind;
  mode?: ShareMode;
}

interface ShareDialogProps {
  readonly target: ShareTarget;
  readonly onClose: () => void;
}

const ShareDialog = ({ onClose, target }: ShareDialogProps): ReactElement => {
  const dismiss = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(dismiss);
  useBackdropDismiss(ref, dismiss);
  const [mode, setMode] = useState<ShareMode>(target.mode ?? "link");
  const isLink = mode === "link";

  return (
    <dialog
      ref={ref}
      className="modal share-dialog"
      aria-label={pick(isLink, copy.shareLinkAria, copy.publishAria)}
    >
      {isLink && (
        <LinkShare
          mode={mode}
          namers={FRAME_NAMERS}
          target={target}
          onClose={onClose}
          onMode={setMode}
        />
      )}
      {!isLink && (
        <>
          <ShareHead
            title={copy.publishOnCloudflare}
            subtitle={copy.putASavedVersion}
            mode={mode}
            onMode={setMode}
            onClose={onClose}
          />
          <PublishPane target={target} onClose={onClose} />
        </>
      )}
    </dialog>
  );
};

export { ShareDialog };

export type { ShareDialogProps, ShareTarget };
