import { useEffect, useRef, useState } from "react";

import { api, errorText } from "../../api.js";
import { frameSrc } from "../../platform/bridge.js";
import { randomToken } from "../../platform/session.js";

interface VersionSlot {
  readonly src: string;
  readonly token: string;
}

const useVersionSlot = (
  projectId: string,
  versionId: string,
  onError: (message: string) => void
): VersionSlot | null => {
  const [slot, setSlot] = useState<VersionSlot | null>(null);
  const report = useRef(onError);

  useEffect(() => {
    report.current = onError;
  }, [onError]);

  useEffect(() => {
    let alive = true;
    const token = randomToken();

    const load = async (): Promise<void> => {
      try {
        const { url } = await api.versionPreview(projectId, versionId);

        if (alive) {
          setSlot({ src: frameSrc(url), token });
        }
      } catch (error) {
        if (alive) {
          report.current(
            `Could not load this version. ${errorText(error)} Close compare and try again.`
          );
        }
      }
    };

    void load();

    return (): void => {
      alive = false;
    };
  }, [projectId, versionId]);

  return slot;
};

export { useVersionSlot };

export type { VersionSlot };
