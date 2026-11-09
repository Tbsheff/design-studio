import type {
  DeviceFrameId,
  DeviceOrientation,
} from "@design-studio/contracts/device-frame";
import { useCallback, useState } from "react";

import {
  readStored,
  removeStored,
  writeStored,
} from "../../platform/storage.js";
import {
  toDeviceKey,
  toOrientationKey,
  toStoredDevice,
  toStoredOrientation,
} from "./device-frame-model.js";

interface PlayDevice {
  readonly device: DeviceFrameId | null;
  readonly orientation: DeviceOrientation;
  readonly setDevice: (next: DeviceFrameId | null) => void;
  readonly toggleOrientation: () => void;
}

const toNextOrientation = (
  orientation: DeviceOrientation
): DeviceOrientation => {
  if (orientation === "landscape") {
    return "portrait";
  }

  return "landscape";
};

const usePlayDevice = (projectId: string): PlayDevice => {
  const [current, setCurrent] = useState<DeviceFrameId | null>(() =>
    toStoredDevice(readStored(toDeviceKey(projectId)))
  );

  const [orientation, setOrientation] = useState<DeviceOrientation>(() =>
    toStoredOrientation(readStored(toOrientationKey(projectId)))
  );

  const setDevice = useCallback(
    (next: DeviceFrameId | null): void => {
      setCurrent(next);

      if (next === null) {
        removeStored(toDeviceKey(projectId));

        return;
      }

      writeStored(toDeviceKey(projectId), next);
    },
    [projectId]
  );

  const toggleOrientation = useCallback((): void => {
    const next = toNextOrientation(orientation);

    setOrientation(next);
    writeStored(toOrientationKey(projectId), next);
  }, [orientation, projectId]);

  const device = current;

  return { device, orientation, setDevice, toggleOrientation };
};

export { usePlayDevice };

export type { PlayDevice };
