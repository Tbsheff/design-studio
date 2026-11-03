import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface SignedInConfirmProps {
  readonly email: string;
  readonly isPending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

const SignedInConfirm = ({
  email,
  isPending,
  onCancel,
  onConfirm,
}: SignedInConfirmProps): ReactElement => (
  <section aria-label={copy.confirmTitle}>
    <h2>{copy.confirmTitle}</h2>
    <p>{`${copy.signedInAs} ${email}`}</p>
    <p>{copy.confirmHint}</p>
    <button type="button" disabled={isPending} onClick={onConfirm}>
      {copy.confirm}
    </button>
    <button type="button" disabled={isPending} onClick={onCancel}>
      {copy.cancel}
    </button>
  </section>
);

export { SignedInConfirm };

export type { SignedInConfirmProps };
