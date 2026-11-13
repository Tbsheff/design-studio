import type { ZoomKey } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { ChangePill } from "./change-pill.js";
import { ChangeRings } from "./change-rings.js";
import type { PreviewApi } from "./preview-frames-api.js";
import { useChangeRings } from "./use-change-rings.js";

interface ChangeOverlayProps {
  readonly frames: Pick<PreviewApi, "listen" | "post">;
  readonly props: {
    readonly directionId: string | null;
    readonly projectId: string;
  };
  readonly pz: {
    readonly applyZoomKey: (key: ZoomKey) => void;
    readonly zoom: number;
  };
}

const ChangeOverlay = ({
  frames: frameApi,
  props,
  pz,
}: ChangeOverlayProps): ReactElement => {
  const changes = useChangeRings({
    directionId: props.directionId,
    frames: frameApi,
    projectId: props.projectId,
    zoomKey: pz.applyZoomKey,
  });

  return (
    <div className="overlay change-overlay">
      <ChangeRings spot={changes.spot} />
      <ChangePill control={changes} zoom={pz.zoom} />
    </div>
  );
};

export { ChangeOverlay };
