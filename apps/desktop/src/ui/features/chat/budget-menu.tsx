import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import { BudgetCustomForm } from "./budget-custom-form.js";
import { PRESETS } from "./budget-limit-model.js";
import { BudgetPreset } from "./budget-preset.js";
import { copy } from "./copy.js";

const BudgetMenu = ({
  current,
  error,
  onPick,
  onClose,
}: {
  current: number | null;
  error: string | null;
  onPick: (value: number | null) => void;
  onClose: () => void;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const [isBad, setIsBad] = useState(false);
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", onDown);
    globalThis.addEventListener("keydown", onKey);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="ui-menu budget-pop"
      role="menu"
      aria-label={copy.spendingLimitPer}
      data-testid="budget-menu"
    >
      <div className="ui-menu-section">
        <div className="ui-menu-label">{copy.spendingLimitPer}</div>
        {PRESETS.map((value) => (
          <BudgetPreset
            key={value ?? "none"}
            current={current}
            value={value}
            onPick={onPick}
          />
        ))}
      </div>
      <BudgetCustomForm onPick={onPick} onInvalid={setIsBad} />
      {(isBad || error) && (
        <p className="ui-menu-note budget-error" role="alert">
          {error ?? "Enter $0.01 to $50, or leave it empty for no limit."}
        </p>
      )}
    </div>
  );
};

export { BudgetMenu };
