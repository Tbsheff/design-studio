import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { KeyForm } from "./key-form.js";
import { KeyRow } from "./key-row.js";
import { SecretLine } from "./secret-line.js";
import { useKeys } from "./use-keys.js";

interface KeysPanelProps {
  readonly children: ReactNode;
}

const KeysPanel = ({ children }: KeysPanelProps): ReactElement => {
  const state = useKeys();

  if (!state.isAvailable) {
    return (
      <>
        <p>{copy.unavailable}</p>
        {children}
      </>
    );
  }

  if (!state.isSignedIn) {
    return (
      <>
        <p>{copy.signedOut}</p>
        {children}
      </>
    );
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
      {children}
    </section>
  );
};

export { KeysPanel };

export type { KeysPanelProps };
