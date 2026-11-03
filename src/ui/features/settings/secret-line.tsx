import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { CreatedKey } from "./keys-model.js";

interface SecretLineProps {
  readonly onDone: () => void;
  readonly secret: CreatedKey;
}

const SecretLine = ({ onDone, secret }: SecretLineProps): ReactElement => {
  const [label, setLabel] = useState<string>(copy.copy);

  const copyKey = useCallback(async (): Promise<void> => {
    await navigator.clipboard.writeText(secret.key);
    setLabel(copy.copied);
  }, [secret.key]);

  return (
    <output>
      <p>{copy.created}</p>
      <code>{secret.key}</code>
      <button type="button" onClick={copyKey}>
        {label}
      </button>
      <button type="button" onClick={onDone}>
        {copy.done}
      </button>
    </output>
  );
};

export { SecretLine };
