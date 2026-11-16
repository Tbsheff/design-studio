import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { pick } from "../../platform/pick.js";

interface ShipInputFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onValue: (value: string) => void;
  readonly isMono: boolean;
  readonly placeholder: string | null;
  readonly isWide: boolean;
}

const ShipInputField = ({
  isMono,
  isWide,
  label,
  onValue,
  placeholder,
  value,
}: ShipInputFieldProps): ReactElement => {
  const changeValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onValue(event.target.value);
    },
    [onValue]
  );

  return (
    <label className={`field${pick(isWide, " ship-wide", "")}`}>
      <span>{label}</span>
      <input
        className={pick(isMono, "mono", "")}
        value={value}
        placeholder={placeholder ?? ""}
        spellCheck={!isMono}
        autoComplete={pick(isMono, "off", "on")}
        onChange={changeValue}
      />
    </label>
  );
};

export { ShipInputField };
