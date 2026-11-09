import { canRotateDevice } from "@design-studio/contracts/device-frame";
import type {
  DeviceFrameId,
  DeviceOrientation,
} from "@design-studio/contracts/device-frame";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { protoCopy } from "./proto-copy.js";

interface RotateButtonProps {
  readonly device: DeviceFrameId | null;
  readonly orientation: DeviceOrientation;
  readonly onRotate: () => void;
}

const toRotateTip = (orientation: DeviceOrientation): string => {
  if (orientation === "landscape") {
    return protoCopy.rotatePortrait;
  }

  return protoCopy.rotateLandscape;
};

const RotateButton = ({
  device,
  orientation,
  onRotate,
}: RotateButtonProps): ReactElement | null => {
  if (device === null || !canRotateDevice(device)) {
    return null;
  }

  return (
    <button
      type="button"
      className="icon-btn small"
      aria-label={protoCopy.rotate}
      aria-pressed={orientation === "landscape"}
      data-tip={toRotateTip(orientation)}
      data-testid="play-rotate"
      onClick={onRotate}
    >
      <Icon name="rotateDevice" size={14} />
    </button>
  );
};

export { RotateButton };
