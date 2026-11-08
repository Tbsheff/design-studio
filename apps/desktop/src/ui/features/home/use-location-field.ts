import type { WorkspaceFolder } from "@design-studio/contracts/folders";
import { useCallback, useState } from "react";

import { CHOOSE, toLocationValue } from "./location-options-model.js";
import type { FolderChooser } from "./use-folder-chooser.js";

interface LocationFieldInput {
  readonly value: string | null;
  readonly chooser: FolderChooser;
  readonly onChange: (path: string | null) => void;
  readonly onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
}

interface LocationFieldState {
  readonly isPasting: boolean;
  readonly saveFolder: (path: string) => Promise<void>;
  readonly handleChange: (next: string) => void;
}

const CHOOSE_TITLE = "Choose where to save the new project";

const useLocationField = (input: LocationFieldInput): LocationFieldState => {
  const { value, chooser, onChange, onAddFolder } = input;
  const [isPasting, setIsPasting] = useState(false);

  const saveFolder = useCallback(
    async (path: string): Promise<void> => {
      const saved = await onAddFolder(path);

      if (saved) {
        setIsPasting(false);
        onChange(saved.path);
      }
    },
    [onAddFolder, onChange]
  );

  const pickFolder = useCallback(async (): Promise<void> => {
    if (chooser.isUnsupported) {
      setIsPasting(true);

      return;
    }

    const picked = await chooser.choose(CHOOSE_TITLE, value);

    if (picked.path) {
      await saveFolder(picked.path);

      return;
    }

    if (picked.isUnsupported) {
      setIsPasting(true);
    }
  }, [chooser, saveFolder, value]);

  const handleChange = useCallback(
    (next: string): void => {
      if (next === CHOOSE) {
        pickFolder();

        return;
      }

      setIsPasting(false);
      onChange(toLocationValue(next));
    },
    [onChange, pickFolder]
  );

  return { handleChange, isPasting, saveFolder };
};

export { useLocationField };
