import type { TokenGroupName } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenNameHelp } from "./token-name-help.js";

interface TokenNameFieldProps {
  readonly group: TokenGroupName;
  readonly isTouched: boolean;
  readonly name: string;
  readonly onName: (value: string) => void;
  readonly problem: string | null;
}

const TokenNameField = (props: TokenNameFieldProps): ReactNode => {
  const { onName } = props;
  let shownProblem: string | null = null;

  if (props.isTouched) {
    shownProblem = props.problem;
  }

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onName(event.target.value);
    },
    [onName]
  );

  return (
    <label className="field tk-row">
      <span>{COPY.tokenName}</span>
      <input
        data-autofocus
        className="mono"
        name="token-name"
        value={props.name}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={shownProblem !== null}
        aria-describedby="tk-name-help"
        onChange={handleNameChange}
      />
      <TokenNameHelp
        group={props.group}
        name={props.name}
        problem={shownProblem}
      />
    </label>
  );
};

export { TokenNameField };
