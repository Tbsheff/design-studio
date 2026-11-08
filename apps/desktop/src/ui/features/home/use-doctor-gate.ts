import { useCallback, useState } from "react";

import type { DoctorGate } from "./doctor-model.js";

const useDoctorGate = () => {
  const [gate, setGate] = useState<DoctorGate | null>(null);
  const close = useCallback(() => setGate(null), []);

  const check = async (): Promise<void> => {
    if (!gate) {
      return;
    }

    setGate({ ...gate, isChecking: true });
    let fixed = false;

    try {
      fixed = await gate.check();
    } catch {
      fixed = false;
    }

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
};

export { useDoctorGate };
