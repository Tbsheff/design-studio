import type { ZoomKey } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";
import { createPortal } from "react-dom";

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
  readonly stage: {
    readonly pz: {
      readonly applyZoomKey: (key: ZoomKey) => void;
      readonly zoom: number;
    };
    readonly stageRef: RefObject<HTMLDivElement | null>;
  };
}

const ChangeOverlay = ({
  frames: frameApi,
  props,
  stage,
}: ChangeOverlayProps): ReactElement => {
  const changes = useChangeRings({
    directionId: props.directionId,
    frames: frameApi,
    projectId: props.projectId,
    stageRef: stage.stageRef,
    zoomKey: stage.pz.applyZoomKey,
  });

  return (
    <div className="overlay change-overlay">
      <ChangeRings spot={changes.spot} zoom={stage.pz.zoom} />
      {changes.host &&
        createPortal(<ChangePill control={changes} />, changes.host)}
    </div>
  );
};

export { ChangeOverlay };
