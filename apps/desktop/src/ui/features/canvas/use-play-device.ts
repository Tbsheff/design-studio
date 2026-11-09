import type { DeviceFrameId } from "@design-studio/contracts/device-frame";
import { useCallback, useState } from "react";

import {
  readStored,
  removeStored,
  writeStored,
} from "../../platform/storage.js";
import { toDeviceKey, toStoredDevice } from "./device-frame-model.js";

interface PlayDevice {
  readonly device: DeviceFrameId | null;
  readonly setDevice: (next: DeviceFrameId | null) => void;
}

const usePlayDevice = (projectId: string): PlayDevice => {
  const [device, setDevice] = useState<DeviceFrameId | null>(() =>
    toStoredDevice(readStored(toDeviceKey(projectId)))
  );

  const chooseDevice = useCallback(
    (next: DeviceFrameId | null): void => {
      setDevice(next);

      if (next === null) {
        removeStored(toDeviceKey(projectId));

        return;
      }

      writeStored(toDeviceKey(projectId), next);
    },
    [projectId]
  );

  return { device, setDevice: chooseDevice };
};

export { usePlayDevice };

export type { PlayDevice };
