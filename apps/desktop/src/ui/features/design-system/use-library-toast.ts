import { useCallback, useEffect, useState } from "react";

import { toRemainingToast } from "./toast-model.js";
import type { ToastEntry } from "./toast-model.js";

const TOAST_MS = 5000;

interface LibraryToast {
  readonly show: (text: string) => void;
  readonly text: string | null;
}

const useLibraryToast = (): LibraryToast => {
  const [toast, setToast] = useState<ToastEntry | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(
      () => setToast((current) => toRemainingToast(current, toast.id)),
      TOAST_MS
    );

    return (): void => clearTimeout(timer);
  }, [toast]);

  const show = useCallback(
    (text: string): void => setToast({ id: Date.now(), text }),
    []
  );

  return { show, text: toast?.text ?? null };
};

export { useLibraryToast };
