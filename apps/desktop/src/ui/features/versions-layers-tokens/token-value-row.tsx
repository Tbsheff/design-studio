import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenValueSwatch } from "./token-value-swatch.js";

interface TokenValueRowProps {
  readonly isOptional: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly paint: string | null;
  readonly problem: string | null;
  readonly value: string;
}

const toValueClass = (hasSwatch: boolean): string => {
  if (hasSwatch) {
    return "tk-value has-swatch";
  }

  return "tk-value ";
};

const TokenValueRow = (props: TokenValueRowProps): ReactNode => {
  const { onChange, paint } = props;
  let placeholder = "";

  if (props.isOptional) {
    placeholder = COPY.tokenSameAsLight;
  }

  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <label className="field tk-row">
      <span>
        {props.label}
        {props.isOptional && (
          <span className="tk-optional">{COPY.tokenOptional}</span>
        )}
      </span>
      <span className={toValueClass(paint !== null)}>
        {paint !== null && <TokenValueSwatch paint={paint} isSmall={false} />}
        <input
          className="mono"
          name="token-value"
          value={props.value}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={props.problem !== null}
          onChange={handleValueChange}
        />
      </span>
      {props.problem && <span className="tk-help error">{props.problem}</span>}
    </label>
  );
};

export { TokenValueRow };
