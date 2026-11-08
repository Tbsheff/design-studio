import { useCallback, useState } from "react";

import type { HomeToastState } from "./home-toast-model.js";

interface HomeToastControls {
  readonly clearToast: () => void;
  readonly showToast: (next: Omit<HomeToastState, "id">) => void;
  readonly toast: HomeToastState | null;
}

const useHomeToast = (): HomeToastControls => {
  const [toast, setToast] = useState<HomeToastState | null>(null);

  const showToast = useCallback((next: Omit<HomeToastState, "id">): void => {
    setToast({ ...next, id: Date.now() });
  }, []);

  const clearToast = useCallback((): void => {
    setToast(null);
  }, []);

  return { clearToast, showToast, toast };
};

export { useHomeToast };

export type { HomeToastControls };
