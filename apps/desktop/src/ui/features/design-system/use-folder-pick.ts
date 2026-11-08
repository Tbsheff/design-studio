import { useCallback, useState } from "react";

import { errorText } from "../../api.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import { COPY } from "./copy.js";

interface FolderPick {
  choose: () => Promise<void>;
  failure: string | null;
  isManual: boolean;
}

const useFolderPick = (onChange: (value: string) => void): FolderPick => {
  const [isManual, setIsManual] = useState(() => !hasNativePicker());
  const [failure, setFailure] = useState<string | null>(null);

  const choose = useCallback(async (): Promise<void> => {
    setFailure(null);

    try {
      const outcome = await pickFolder({ title: COPY.titleChooseCodeFolder });

      if (outcome.kind === "picked") {
        onChange(outcome.path);
      }

      if (outcome.kind === "unsupported") {
        setIsManual(true);
      }
    } catch (error: unknown) {
      setFailure(errorText(error));
    }
  }, [onChange]);

  return { choose, failure, isManual };
};

export { useFolderPick };

export type { FolderPick };
