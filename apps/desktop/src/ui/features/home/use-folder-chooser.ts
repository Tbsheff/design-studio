import { useState } from "react";

import { errorText } from "../../api.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";

type ChooseResult =
  | { readonly path: string; readonly isUnsupported: false }
  | { readonly path: null; readonly isUnsupported: boolean };

interface FolderChooser {
  readonly choose: (
    title: string,
    defaultPath?: string
  ) => Promise<ChooseResult>;
  readonly isUnsupported: boolean;
  readonly isPicking: boolean;
}

const useFolderChooser = (
  onError: (message: string) => void
): FolderChooser => {
  const [unsupported, setUnsupported] = useState(() => !hasNativePicker());
  const [picking, setPicking] = useState(false);

  const choose = async (
    title: string,
    defaultPath?: string
  ): Promise<ChooseResult> => {
    setPicking(true);

    try {
      const outcome = await pickFolder({
        title,
        ...(defaultPath ? { defaultPath } : {}),
      });

      if (outcome.kind === "unsupported") {
        setUnsupported(true);
      }

      return outcome.kind === "picked"
        ? { isUnsupported: false, path: outcome.path }
        : { isUnsupported: outcome.kind === "unsupported", path: null };
    } catch (error) {
      onError(errorText(error));

      return { isUnsupported: false, path: null };
    } finally {
      setPicking(false);
    }
  };

  return { choose, isPicking: picking, isUnsupported: unsupported };
};

export { useFolderChooser };

export type { FolderChooser };
