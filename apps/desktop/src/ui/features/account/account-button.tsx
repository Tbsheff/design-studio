import { Icon } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { AccountDropdown } from "./account-dropdown.js";
import { openSettings, toInitial } from "./account-model.js";
import { copy } from "./copy.js";
import { useAccount } from "./use-account.js";

const FACE_ICON_SIZE = 12;

const toFace = (isSignedIn: boolean, initial: string | null): ReactNode => {
  if (isSignedIn && initial !== null) {
    return initial;
  }

  return <Icon name="user" size={FACE_ICON_SIZE} />;
};

const AccountButton = (): ReactElement => {
  const { isPending, signIn, signOut, view } = useAccount();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const isSignedIn = view.phase === "signed-in" && view.user !== null;
  const initial = toInitial(view.user);

  const close = useCallback((refocus: boolean): void => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  const toggle = useCallback((): void => setOpen((isOpen) => !isOpen), []);

  const runSettings = useCallback((): void => {
    setOpen(false);
    openSettings();
  }, []);

  const runAuth = useCallback((): void => {
    setOpen(false);

    if (isSignedIn) {
      signOut();

      return;
    }

    signIn();
  }, [isSignedIn, signIn, signOut]);

  return (
    <span className="account-anchor">
      <button
        ref={trigger}
        type="button"
        className="topbar-avatar"
        aria-label={copy.accountMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={copy.accountTip}
        data-tip-align="end"
        onClick={toggle}
      >
        {toFace(isSignedIn, initial)}
      </button>
      {open && (
        <AccountDropdown
          isDisabled={isPending || view.phase === "pending"}
          isSignedIn={isSignedIn}
          onAuth={runAuth}
          onClose={close}
          onSettings={runSettings}
          trigger={trigger}
          user={view.user}
        />
      )}
    </span>
  );
};

export { AccountButton };
