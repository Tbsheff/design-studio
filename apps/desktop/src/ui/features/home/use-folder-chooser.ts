import { useState } from "react";

import { errorText } from "../../api.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";

type ChooseResult =
  | { readonly path: string; readonly unsupported: false }
  | { readonly path: null; readonly unsupported: boolean };

export interface FolderChooser {
  readonly choose: (
    title: string,
    defaultPath?: string
  ) => Promise<ChooseResult>;
  readonly unsupported: boolean;
  readonly picking: boolean;
}

export function useFolderChooser(
  onError: (message: string) => void
): FolderChooser {
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
        ? { path: outcome.path, unsupported: false }
        : { path: null, unsupported: outcome.kind === "unsupported" };
    } catch (err) {
      onError(errorText(err));

      return { path: null, unsupported: false };
    } finally {
      setPicking(false);
    }
  };

  return { choose, unsupported, picking };
}
