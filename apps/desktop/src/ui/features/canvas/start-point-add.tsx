import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { startCopy } from "./copy.js";

interface StartPointAddProps {
  readonly suggested: string;
  readonly reason: string | null;
  readonly onAdd: (name: string) => void;
}

const StartPointAdd = ({
  suggested,
  reason,
  onAdd,
}: StartPointAddProps): ReactElement => {
  const [name, setName] = useState(suggested);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setName(event.currentTarget.value),
    []
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      onAdd(name.trim());
    },
    [name, onAdd]
  );

  return (
    <form className="start-add" onSubmit={onSubmit}>
      <input
        className="start-row-name"
        value={name}
        aria-label={startCopy.name}
        placeholder={startCopy.namePlaceholder}
        maxLength={40}
        disabled={reason !== null}
        onChange={onChange}
      />
      <button
        type="submit"
        className="btn small"
        data-tip={reason ?? startCopy.addTip}
        data-testid="start-point-add"
        disabled={reason !== null || name.trim() === ""}
      >
        <Icon name="plus" size={12} />
        {startCopy.addHere}
      </button>
    </form>
  );
};

export { StartPointAdd };
