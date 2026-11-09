import {
  isDeviceFrameId,
  toDeviceFrame,
  toDeviceOuterSize,
  DEVICE_FRAME_IDS,
} from "@design-studio/contracts/device-frame";
import type { DeviceFrameId } from "@design-studio/contracts/device-frame";

import { copy } from "./copy.js";
import { scaleFor } from "./play-model.js";
import type { Slot, StageSize } from "./play-model.js";

interface DeviceOption {
  readonly label: string;
  readonly value: string;
}

interface SlotLayout {
  readonly deviceId: DeviceFrameId | null;
  readonly left: number;
  readonly outerHeight: number;
  readonly outerRadius: number;
  readonly outerWidth: number;
  readonly scale: number;
  readonly screenRadius: number;
  readonly top: number;
  readonly viewHeight: number;
  readonly viewWidth: number;
}

const NO_DEVICE = "none";

const DEVICE_KEY_PREFIX = "design-studio.play-device.";

const toDeviceKey = (projectId: string): string =>
  `${DEVICE_KEY_PREFIX}${projectId}`;

const toStoredDevice = (raw: string | null): DeviceFrameId | null => {
  if (raw !== null && isDeviceFrameId(raw)) {
    return raw;
  }

  return null;
};

const toDeviceValue = (device: DeviceFrameId | null): string => {
  if (device === null) {
    return NO_DEVICE;
  }

  return device;
};

const toDeviceOptions = (): readonly DeviceOption[] => [
  { label: copy.none, value: NO_DEVICE },
  ...DEVICE_FRAME_IDS.map((id) => ({
    label: toDeviceFrame(id).label,
    value: id,
  })),
];

const DEVICE_OPTIONS: readonly DeviceOption[] = toDeviceOptions();

const toPlainLayout = (slot: Slot, stage: StageSize): SlotLayout => ({
  deviceId: null,
  left: 0,
  outerHeight: slot.frame.height,
  outerRadius: 0,
  outerWidth: slot.frame.width,
  scale: scaleFor(slot, stage),
  screenRadius: 0,
  top: 0,
  viewHeight: slot.frame.height,
  viewWidth: slot.frame.width,
});

const toDeviceScale = (
  slot: Slot,
  stage: StageSize,
  outer: { readonly height: number; readonly width: number }
): number =>
  scaleFor(
    {
      ...slot,
      frame: { ...slot.frame, height: outer.height, width: outer.width },
    },
    stage
  );

const toSlotLayout = (
  slot: Slot,
  stage: StageSize,
  device: DeviceFrameId | null
): SlotLayout => {
  if (device === null || slot.overlay) {
    return toPlainLayout(slot, stage);
  }

  const spec = toDeviceFrame(device);
  const outer = toDeviceOuterSize(device);

  return {
    deviceId: device,
    left: spec.insets.left,
    outerHeight: outer.height,
    outerRadius: spec.outerRadius,
    outerWidth: outer.width,
    scale: toDeviceScale(slot, stage, outer),
    screenRadius: spec.screenRadius,
    top: spec.insets.top,
    viewHeight: spec.screenHeight,
    viewWidth: spec.screenWidth,
  };
};

export {
  DEVICE_OPTIONS,
  NO_DEVICE,
  toDeviceKey,
  toDeviceValue,
  toSlotLayout,
  toStoredDevice,
};

export type { DeviceOption, SlotLayout };
