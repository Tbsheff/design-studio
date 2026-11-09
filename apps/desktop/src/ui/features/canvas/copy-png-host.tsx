import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { ViewProps } from "./canvas-types.js";
import { copy } from "./copy.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import { useCopyPng } from "./use-copy-png.js";

const CopyPngHost = ({
  frames,
  props,
}: {
  readonly frames: CanvasFrames;
  readonly props: ViewProps;
}): ReactElement | null => {
  const { dismiss, notice } = useCopyPng({
    active: frames.active,
    frames: frames.layout.frames,
    projectId: props.projectId,
    selector: props.selection[0]?.selector ?? null,
    versionId: props.headVersionId,
  });

  if (notice === null) {
    return null;
  }

  return (
    <output className="edit-notice">
      <span>{notice}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        onClick={dismiss}
      >
        <Icon name="close" size={14} />
      </button>
    </output>
  );
};

export { CopyPngHost };
