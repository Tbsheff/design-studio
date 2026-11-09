const DEVICE_FRAME_IDS = [
  "iphone-15",
  "pixel-8",
  "ipad",
  "macbook",
  "browser",
] as const;

const DEVICE_ORIENTATIONS = ["portrait", "landscape"] as const;

type DeviceOrientation = (typeof DEVICE_ORIENTATIONS)[number];

const ROTATABLE_DEVICE_IDS: ReadonlySet<string> = new Set([
  "iphone-15",
  "pixel-8",
  "ipad",
]);

type DeviceFrameId = (typeof DEVICE_FRAME_IDS)[number];

interface DeviceFrameInsets {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface DeviceFrameSpec {
  readonly id: DeviceFrameId;
  readonly insets: DeviceFrameInsets;
  readonly label: string;
  readonly outerRadius: number;
  readonly screenHeight: number;
  readonly screenRadius: number;
  readonly screenWidth: number;
}

interface DeviceFrameSize {
  readonly height: number;
  readonly width: number;
}

const DEVICE_FRAMES: Readonly<Record<DeviceFrameId, DeviceFrameSpec>> = {
  browser: {
    id: "browser",
    insets: { bottom: 0, left: 0, right: 0, top: 44 },
    label: "Browser",
    outerRadius: 12,
    screenHeight: 800,
    screenRadius: 0,
    screenWidth: 1280,
  },
  ipad: {
    id: "ipad",
    insets: { bottom: 36, left: 36, right: 36, top: 36 },
    label: "iPad",
    outerRadius: 44,
    screenHeight: 1180,
    screenRadius: 12,
    screenWidth: 820,
  },
  "iphone-15": {
    id: "iphone-15",
    insets: { bottom: 14, left: 14, right: 14, top: 14 },
    label: "iPhone 15",
    outerRadius: 67,
    screenHeight: 852,
    screenRadius: 53,
    screenWidth: 393,
  },
  macbook: {
    id: "macbook",
    insets: { bottom: 32, left: 24, right: 24, top: 24 },
    label: "MacBook",
    outerRadius: 28,
    screenHeight: 900,
    screenRadius: 6,
    screenWidth: 1440,
  },
  "pixel-8": {
    id: "pixel-8",
    insets: { bottom: 12, left: 12, right: 12, top: 12 },
    label: "Pixel 8",
    outerRadius: 52,
    screenHeight: 915,
    screenRadius: 40,
    screenWidth: 412,
  },
};

const toDeviceFrame = (id: DeviceFrameId): DeviceFrameSpec => DEVICE_FRAMES[id];

const toDeviceOuterSize = (id: DeviceFrameId): DeviceFrameSize => {
  const spec = DEVICE_FRAMES[id];

  return {
    height: spec.screenHeight + spec.insets.top + spec.insets.bottom,
    width: spec.screenWidth + spec.insets.left + spec.insets.right,
  };
};

const canRotateDevice = (id: DeviceFrameId): boolean =>
  ROTATABLE_DEVICE_IDS.has(id);

const toOrientedDeviceFrame = (
  id: DeviceFrameId,
  orientation: DeviceOrientation
): DeviceFrameSpec => {
  const spec = DEVICE_FRAMES[id];

  if (orientation === "portrait" || !canRotateDevice(id)) {
    return spec;
  }

  return {
    ...spec,
    insets: {
      bottom: spec.insets.right,
      left: spec.insets.bottom,
      right: spec.insets.top,
      top: spec.insets.left,
    },
    screenHeight: spec.screenWidth,
    screenWidth: spec.screenHeight,
  };
};

const toOrientedOuterSize = (
  id: DeviceFrameId,
  orientation: DeviceOrientation
): DeviceFrameSize => {
  const spec = toOrientedDeviceFrame(id, orientation);

  return {
    height: spec.screenHeight + spec.insets.top + spec.insets.bottom,
    width: spec.screenWidth + spec.insets.left + spec.insets.right,
  };
};

const isDeviceOrientation = (value: string): value is DeviceOrientation =>
  DEVICE_ORIENTATIONS.some((orientation) => orientation === value);

const isDeviceFrameId = (value: string): value is DeviceFrameId =>
  DEVICE_FRAME_IDS.some((id) => id === value);

export {
  DEVICE_FRAMES,
  DEVICE_FRAME_IDS,
  DEVICE_ORIENTATIONS,
  canRotateDevice,
  isDeviceFrameId,
  isDeviceOrientation,
  toDeviceFrame,
  toDeviceOuterSize,
  toOrientedDeviceFrame,
  toOrientedOuterSize,
};

export type {
  DeviceFrameId,
  DeviceFrameInsets,
  DeviceFrameSize,
  DeviceFrameSpec,
  DeviceOrientation,
};
