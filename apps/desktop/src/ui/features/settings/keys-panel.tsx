import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { KeyForm } from "./key-form.js";
import { KeyRow } from "./key-row.js";
import { SecretLine } from "./secret-line.js";
import { useKeys } from "./use-keys.js";

const KeysPanel = (): ReactElement => {
  const state = useKeys();

  if (!state.isAvailable) {
    return <p className="field-help">{copy.unavailable}</p>;
  }

  if (!state.isSignedIn) {
    return <p className="field-help">{copy.signedOut}</p>;
  }

  return (
    <section aria-label={copy.title}>
      <h3>{copy.title}</h3>
      {state.secret !== null && (
        <SecretLine secret={state.secret} onDone={state.handleDismiss} />
      )}
      <KeyForm isPending={state.isPending} onCreate={state.handleCreate} />
      {state.keys.length === 0 && <p>{copy.empty}</p>}
      <ul>
        {state.keys.map((item) => (
          <KeyRow
            key={item.keyId}
            isPending={state.isPending}
            item={item}
            onRevoke={state.handleRevoke}
          />
        ))}
      </ul>
      {state.error !== null && <p role="alert">{state.error}</p>}
    </section>
  );
};

export { KeysPanel };
