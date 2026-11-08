import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { TOAST_MS } from "./home-toast-model.js";
import type { HomeToastState } from "./home-toast-model.js";
import { ToastCard } from "./toast-card.js";

const HomeToast = ({
  toast,
  onDone,
}: {
  readonly toast: HomeToastState | null;
  readonly onDone: () => void;
}): ReactElement => {
  const [isHeld, setIsHeld] = useState(false);
  useEffect(() => {
    if (!toast || isHeld || toast.action || toast.hasError) {
      return;
    }

    const timer = globalThis.setTimeout(onDone, TOAST_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [toast, isHeld, onDone]);

  return (
    <output className="ds-toast-slot" aria-live="polite">
      {toast && (
        <ToastCard
          key={toast.id}
          toast={toast}
          onHold={setIsHeld}
          onDone={onDone}
        />
      )}
    </output>
  );
};

export { HomeToast };
