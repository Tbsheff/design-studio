import {
  canRotateDevice,
  isDeviceFrameId,
  isDeviceOrientation,
  toDeviceFrame,
  toOrientedDeviceFrame,
  toOrientedOuterSize,
  DEVICE_FRAME_IDS,
} from "@design-studio/contracts/device-frame";
import type {
  DeviceFrameId,
  DeviceOrientation,
} from "@design-studio/contracts/device-frame";

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
  readonly orientation: DeviceOrientation;
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

const toOrientationKey = (projectId: string): string =>
  `${DEVICE_KEY_PREFIX}orientation.${projectId}`;

const toStoredOrientation = (raw: string | null): DeviceOrientation => {
  if (raw !== null && isDeviceOrientation(raw)) {
    return raw;
  }

  return "portrait";
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
  orientation: "portrait",
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

const toRenderedOrientation = (
  device: DeviceFrameId,
  orientation: DeviceOrientation
): DeviceOrientation => {
  if (canRotateDevice(device)) {
    return orientation;
  }

  return "portrait";
};

const toSlotLayout = (
  slot: Slot,
  stage: StageSize,
  device: DeviceFrameId | null,
  orientation: DeviceOrientation
): SlotLayout => {
  if (device === null || slot.overlay) {
    return toPlainLayout(slot, stage);
  }

  const spec = toOrientedDeviceFrame(device, orientation);
  const outer = toOrientedOuterSize(device, orientation);

  return {
    deviceId: device,
    left: spec.insets.left,
    orientation: toRenderedOrientation(device, orientation),
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
  toOrientationKey,
  toSlotLayout,
  toStoredDevice,
  toStoredOrientation,
};

export type { DeviceOption, SlotLayout };
