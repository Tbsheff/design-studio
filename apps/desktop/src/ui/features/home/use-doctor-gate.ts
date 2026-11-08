import { useCallback, useState } from "react";

import type { DoctorGate } from "./doctor-model.js";

interface DoctorGateController {
  readonly check: () => Promise<void>;
  readonly close: () => void;
  readonly gate: DoctorGate | null;
  readonly open: (next: Omit<DoctorGate, "isChecking">) => void;
}

const useDoctorGate = (): DoctorGateController => {
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
    open: (next: Omit<DoctorGate, "isChecking">): void =>
      setGate({ ...next, isChecking: false }),
  };
};

export { useDoctorGate };

export type { DoctorGateController };
