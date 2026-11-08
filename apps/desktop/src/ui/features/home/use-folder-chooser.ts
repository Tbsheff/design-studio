import { useState } from "react";

import { errorText } from "../../api.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";

type ChooseResult =
  | { readonly path: string; readonly isUnsupported: false }
  | { readonly path: null; readonly isUnsupported: boolean };

interface FolderChooser {
  readonly choose: (
    title: string,
    defaultPath: string | null
  ) => Promise<ChooseResult>;
  readonly isUnsupported: boolean;
  readonly isPicking: boolean;
}

const toPickOptions = (
  title: string,
  defaultPath: string | null
): Parameters<typeof pickFolder>[0] => {
  if (defaultPath) {
    return { defaultPath, title };
  }

  return { title };
};

const toChooseResult = (
  outcome: Awaited<ReturnType<typeof pickFolder>>
): ChooseResult => {
  if (outcome.kind === "picked") {
    return { isUnsupported: false, path: outcome.path };
  }

  return { isUnsupported: outcome.kind === "unsupported", path: null };
};

const useFolderChooser = (
  onError: (message: string) => void
): FolderChooser => {
  const [isUnsupported, setIsUnsupported] = useState(() => !hasNativePicker());
  const [isPicking, setIsPicking] = useState(false);

  const attempt = async (
    title: string,
    defaultPath: string | null
  ): Promise<ChooseResult> => {
    try {
      const outcome = await pickFolder(toPickOptions(title, defaultPath));

      if (outcome.kind === "unsupported") {
        setIsUnsupported(true);
      }

      return toChooseResult(outcome);
    } catch (error) {
      onError(errorText(error));

      return { isUnsupported: false, path: null };
    }
  };

  const choose = async (
    title: string,
    defaultPath: string | null
  ): Promise<ChooseResult> => {
    setIsPicking(true);
    const result = await attempt(title, defaultPath);
    setIsPicking(false);

    return result;
  };

  return { choose, isPicking, isUnsupported };
};

export { useFolderChooser };

export type { ChooseResult, FolderChooser };
