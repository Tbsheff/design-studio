import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

const TEXT_ROWS = 5;

interface DesignMdFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

const DesignMdField = ({
  value,
  onChange,
}: DesignMdFieldProps): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <label className="field">
      <span>{copy.designMdOptionalTheAgent}</span>
      <textarea
        aria-label={copy.designMd}
        className="mono"
        rows={TEXT_ROWS}
        value={value}
        onChange={change}
        placeholder={copy.brandPrimaryColor0b6e4fHeadings}
        spellCheck={false}
      />
    </label>
  );
};

export { DesignMdField };
