import type { ReactElement } from "react";

interface VariableNamesProps {
  readonly id: string;
  readonly names: readonly string[];
}

const VariableNames = ({ id, names }: VariableNamesProps): ReactElement => (
  <datalist id={id}>
    {names.map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    ))}
  </datalist>
);

export { VariableNames };

export type { VariableNamesProps };
