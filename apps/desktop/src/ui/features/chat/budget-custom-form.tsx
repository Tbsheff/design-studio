import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { parseLimit } from "./budget-limit-model.js";
import { copy } from "./copy.js";

const BudgetCustomForm = ({
  onPick,
  onInvalid,
}: {
  onPick: (value: number | null) => void;
  onInvalid: (isInvalid: boolean) => void;
}): ReactElement => {
  const [custom, setCustom] = useState("");
  const [isBad, setIsBad] = useState(false);

  const handleSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      const value = parseLimit(custom);
      setIsBad(value === "bad");
      onInvalid(value === "bad");

      if (value !== "bad") {
        onPick(value);
      }
    },
    [custom, onPick, onInvalid]
  );

  const handleLimitInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCustom(event.target.value),
    []
  );

  return (
    <form className="ui-menu-section budget-custom" onSubmit={handleSubmit}>
      <label className="budget-custom-row">
        <span>{copy.other}</span>
        <input
          name="limit"
          aria-label={copy.otherSpendingLimit}
          inputMode="decimal"
          placeholder={copy.text001To}
          value={custom}
          aria-invalid={isBad}
          onChange={handleLimitInput}
        />
      </label>
      <button type="submit" className="btn small">
        {copy.set}
      </button>
    </form>
  );
};

export { BudgetCustomForm };
