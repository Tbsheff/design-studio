import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { api } from "../../api.js";
import { copy } from "./copy.js";

interface CheckScreenshotProps {
  readonly projectId: string;
  readonly filePath: string;
  readonly label: string;
}

const CheckScreenshot = ({
  filePath,
  label,
  projectId,
}: CheckScreenshotProps): ReactElement | null => {
  const [src, setSrc] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let isAlive = true;
    let objectUrl: string | null = null;

    const load = async (): Promise<void> => {
      try {
        const blob = await api.projectFile(projectId, filePath);

        if (!isAlive) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (isAlive) {
          setHasFailed(true);
        }
      }
    };

    void load();

    return (): void => {
      isAlive = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [projectId, filePath]);

  if (hasFailed) {
    return (
      <div className="muted small-text">{copy.screenshotNotAvailable}</div>
    );
  }

  if (!src) {
    return null;
  }

  return (
    <img
      className="check-shot"
      src={src}
      alt={`${label} ${copy.screenshotAltSuffix}`}
    />
  );
};

export { CheckScreenshot };
