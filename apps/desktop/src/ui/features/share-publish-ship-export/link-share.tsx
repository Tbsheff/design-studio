import type { ReactElement } from "react";
import { useMemo } from "react";

import { canvasFrameChoices } from "./export-api.js";
import { toFrameLabels } from "./frame-labels.js";
import { ShareLinkForm } from "./share-link-form.js";
import type { ShareMode } from "./share-mode.js";
import { useCopyNew } from "./use-copy-new.js";
import type { ShareTargetInput } from "./use-share-form.js";
import { useShares } from "./use-shares.js";

type FrameNamers = Parameters<typeof toFrameLabels>[2];

interface Props {
  readonly mode: ShareMode;
  readonly namers: FrameNamers;
  readonly target: ShareTargetInput;
  readonly onClose: () => void;
  readonly onMode: (mode: ShareMode) => void;
}

const LinkShare = ({
  mode,
  namers,
  onClose,
  onMode,
  target,
}: Props): ReactElement => {
  const shares = useShares(target.projectId);
  const copied = useCopyNew(shares.links, shares.server);

  const labels = useMemo(
    () =>
      toFrameLabels(
        target.projectId,
        canvasFrameChoices(target.projectId, target.directionId),
        namers
      ),
    [target.projectId, target.directionId, namers]
  );

  return (
    <ShareLinkForm
      target={target}
      shares={shares}
      copied={copied}
      labels={labels}
      mode={mode}
      onMode={onMode}
      onClose={onClose}
    />
  );
};

export { LinkShare };
