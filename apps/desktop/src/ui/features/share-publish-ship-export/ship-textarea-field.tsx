import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

interface ShipTextareaFieldProps {
  readonly label: string;
  readonly value: string;
  readonly rows: number;
  readonly onValue: (value: string) => void;
}

const ShipTextareaField = ({
  label,
  onValue,
  rows,
  value,
}: ShipTextareaFieldProps): ReactElement => {
  const changeValue = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onValue(event.target.value);
    },
    [onValue]
  );

  return (
    <label className="field ship-wide">
      <span>{label}</span>
      <textarea
        className="mono"
        rows={rows}
        value={value}
        onChange={changeValue}
      />
    </label>
  );
};

export { ShipTextareaField };
