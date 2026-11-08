import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

const FlowParamField = ({
  name,
  onChange,
  value,
}: {
  name: string;
  onChange: (name: string, value: string) => void;
  value: string;
}): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange(name, event.target.value),
    [onChange, name]
  );

  return (
    <label className="flow-row flow-param">
      <span className="flow-label mono">{name}</span>
      <input
        className="mono"
        value={value}
        placeholder={copy.sampleValue}
        spellCheck={false}
        onChange={change}
      />
    </label>
  );
};

export { FlowParamField };
