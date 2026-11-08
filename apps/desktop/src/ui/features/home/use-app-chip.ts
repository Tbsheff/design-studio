import { useCallback, useEffect, useState } from "react";

import { api, errorText } from "../../api.js";
import type { AppChip } from "./app-chip-model.js";
import { toOptionalArg } from "./optional-arg-model.js";

interface AppChipState {
  readonly chip: AppChip | null;
  readonly clear: () => void;
  readonly set: (path: string) => void;
  readonly update: (patch: Partial<AppChip>) => void;
}

const toChecked = (
  current: AppChip | null,
  path: string,
  nonce: number,
  patch: Partial<AppChip>
): AppChip | null => {
  if (current?.path === path && current.nonce === nonce) {
    return { ...current, ...patch, isChecking: false };
  }

  return current;
};

const useAppChip = (): AppChipState => {
  const [chip, setChip] = useState<AppChip | null>(null);

  const set = useCallback((folderPath: string): void => {
    setChip({
      appDir: null,
      env: "",
      error: null,
      inspection: null,
      isChecking: true,
      mode: "start",
      nonce: 0,
      path: folderPath,
      url: "",
    });
  }, []);

  const clear = useCallback((): void => setChip(null), []);

  const update = useCallback((patch: Partial<AppChip>): void => {
    setChip((current) => {
      if (current) {
        return { ...current, ...patch };
      }

      return current;
    });
  }, []);

  const path = chip?.path ?? null;
  const appDir = chip?.appDir ?? null;
  const nonce = chip?.nonce ?? 0;
  useEffect(() => {
    if (!path) {
      return;
    }

    let live = true;

    const inspect = async (): Promise<void> => {
      setChip((current) => {
        if (current) {
          return { ...current, error: null, isChecking: true };
        }

        return current;
      });

      try {
        const inspection = await api.inspectFolder(
          path,
          ...toOptionalArg(appDir)
        );

        if (live) {
          setChip((current) => toChecked(current, path, nonce, { inspection }));
        }
      } catch (error: unknown) {
        if (live) {
          setChip((current) =>
            toChecked(current, path, nonce, { error: errorText(error) })
          );
        }
      }
    };

    inspect();

    return (): void => {
      live = false;
    };
  }, [path, appDir, nonce]);

  return { chip, clear, set, update };
};

export { useAppChip };

export type { AppChipState };
