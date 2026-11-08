import { useCallback } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy";
import { isCustomBlocked } from "./routes-model";

interface RoutesCustomFormProps {
  readonly custom: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
}

const RoutesCustomForm = ({
  custom,
  onChange,
  onSubmit,
}: RoutesCustomFormProps): ReactElement => {
  const changeCustom = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  const submitCustom = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  return (
    <form className="app-route-custom" onSubmit={submitCustom}>
      <input
        name="route"
        className="mono"
        value={custom}
        placeholder="/patients/123"
        aria-label="Route to add"
        onChange={changeCustom}
      />
      <button
        type="submit"
        className="btn small"
        disabled={isCustomBlocked(custom)}
      >
        {copy.addFrame}
      </button>
    </form>
  );
};

export { RoutesCustomForm };
