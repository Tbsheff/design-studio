import type { ReactElement } from "react";

import { needsConfirm, toStatusText } from "./account-model.js";
import { copy } from "./copy.js";
import { ErrorLine } from "./error-line.js";
import { SignedInConfirm } from "./signed-in-confirm.js";
import { useAccount } from "./use-account.js";

const AccountMenu = (): ReactElement => {
  const { cancel, confirm, error, isPending, signIn, signOut, view } =
    useAccount();

  if (needsConfirm(view) && view.user !== null) {
    return (
      <SignedInConfirm
        email={view.user.email}
        isPending={isPending}
        onCancel={cancel}
        onConfirm={confirm}
      />
    );
  }

  if (view.phase === "signed-in" && view.user !== null) {
    return (
      <section>
        <p>{`${copy.signedInAs} ${view.user.email}`}</p>
        <h3>{copy.orgs}</h3>
        <ul>
          {view.orgs.map((org) => (
            <li key={org.id}>{`${org.name} (${org.role})`}</li>
          ))}
        </ul>
        <button type="button" disabled={isPending} onClick={signOut}>
          {copy.signOut}
        </button>
        <ErrorLine error={error} />
      </section>
    );
  }

  return (
    <section>
      <p>{toStatusText(view.phase)}</p>
      <button
        type="button"
        disabled={isPending || view.phase === "pending"}
        onClick={signIn}
      >
        {copy.signIn}
      </button>
      <ErrorLine error={error} />
    </section>
  );
};

export { AccountMenu };
