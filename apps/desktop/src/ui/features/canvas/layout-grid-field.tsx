import { useCallback } from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from "react";

import type { LayoutGridDraft } from "./layout-grid-model.js";

interface LayoutGridFieldProps {
  readonly field: keyof LayoutGridDraft;
  readonly label: string;
  readonly onChange: (field: keyof LayoutGridDraft, value: string) => void;
  readonly onCommit: () => void;
  readonly placeholder: string;
  readonly value: string;
}

const LayoutGridField = ({
  field,
  label,
  onChange,
  onCommit,
  placeholder,
  value,
}: LayoutGridFieldProps): ReactElement => {
  const changeValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(field, event.currentTarget.value),
    [field, onChange]
  );

  const commitOnEnter = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        onCommit();
      }
    },
    [onCommit]
  );

  return (
    <label className="ui-field layout-grid-field">
      <span className="ui-field-label">{label}</span>
      <input
        aria-label={label}
        inputMode="numeric"
        onBlur={onCommit}
        onChange={changeValue}
        onKeyDown={commitOnEnter}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
};

export { LayoutGridField };
