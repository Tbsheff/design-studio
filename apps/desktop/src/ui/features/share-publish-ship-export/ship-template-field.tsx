import type { ShipSettings } from "@design-studio/contracts/ship";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

type TextField = "bodyTemplate" | "branchTemplate" | "issueId" | "user";

interface Props {
  field: TextField;
  label: string;
  placeholder: string | null;
  value: string;
  onChange: (patch: Partial<ShipSettings>) => void;
}

const ShipTemplateField = ({
  field,
  label,
  onChange,
  placeholder,
  value,
}: Props): ReactElement => {
  const change = useCallback(
    (changeEvent: ChangeEvent<HTMLInputElement>): void => {
      onChange({ [field]: changeEvent.target.value });
    },
    [field, onChange]
  );

  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="mono"
        value={value}
        placeholder={placeholder ?? ""}
        spellCheck={false}
        autoComplete="off"
        onChange={change}
      />
    </label>
  );
};

export { ShipTemplateField };

export type { TextField };
