import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

const CHEVRON_SIZE = 14;

const ENV_ROWS = 3;

interface DevServerEnvProps {
  readonly env: string;
  readonly onEnv: (env: string) => void;
}

const DevServerEnv = ({ env, onEnv }: DevServerEnvProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(() => env.trim() !== "");

  const toggle = useCallback((): void => {
    setIsOpen((previous) => !previous);
  }, []);

  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onEnv(event.target.value);
    },
    [onEnv]
  );

  return (
    <>
      <button
        type="button"
        className="ui-menu-item"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        {isOpen && <Icon name="chevronDown" size={CHEVRON_SIZE} />}
        {!isOpen && <Icon name="chevronRight" size={CHEVRON_SIZE} />}
        <span>{copy.environmentForNextDev}</span>
      </button>
      {isOpen && (
        <textarea
          className="mono"
          name="env"
          rows={ENV_ROWS}
          value={env}
          placeholder={copy.skipEnvValidationTrue}
          spellCheck={false}
          aria-label={copy.environmentForNextDev}
          onChange={change}
        />
      )}
    </>
  );
};

export { DevServerEnv };
