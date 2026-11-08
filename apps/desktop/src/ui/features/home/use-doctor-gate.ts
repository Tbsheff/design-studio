import { useCallback, useState } from "react";

import type { DoctorGate } from "./doctor-model.js";

function useDoctorGate() {
  const [gate, setGate] = useState<DoctorGate | null>(null);
  const close = useCallback(() => setGate(null), []);

  const check = async () => {
    if (!gate) {
      return;
    }

    setGate({ ...gate, isChecking: true });
    const fixed = await gate.check().catch(() => false);

    if (fixed) {
      setGate(null);
      gate.proceed();
    } else {
      setGate({ ...gate, isChecking: false });
    }
  };

  return {
    check,
    close,
    gate,
    open: (next: Omit<DoctorGate, "isChecking">) =>
      setGate({ ...next, isChecking: false }),
  };
}

export { useDoctorGate };
