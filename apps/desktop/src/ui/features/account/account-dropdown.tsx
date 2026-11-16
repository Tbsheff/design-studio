import { useFitPopover, usePopover } from "@design-studio/ui";
import { useRef } from "react";
import type { ReactElement, RefObject } from "react";

import { toUserLabel } from "./account-model.js";
import type { AccountView } from "./account-model.js";
import { AccountRow } from "./account-row.js";
import { copy } from "./copy.js";

interface AccountDropdownProps {
  readonly isDisabled: boolean;
  readonly isReady: boolean;
  readonly isSignedIn: boolean;
  readonly onAuth: () => void;
  readonly onClose: (refocus: boolean) => void;
  readonly onSettings: () => void;
  readonly trigger: RefObject<HTMLButtonElement | null>;
  readonly user: AccountView["user"];
}

const toAuthLabel = (isSignedIn: boolean, isReady: boolean): string => {
  if (isSignedIn) {
    return copy.signOut;
  }

  if (!isReady) {
    return copy.signInUnset;
  }

  return copy.signIn;
};

const AccountDropdown = ({
  isDisabled,
  isReady,
  isSignedIn,
  onAuth,
  onClose,
  onSettings,
  trigger,
  user,
}: AccountDropdownProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);

  usePopover(true, root, onClose, trigger);
  useFitPopover(root, trigger, true);

  return (
    <div
      ref={root}
      className="ui-menu account-menu"
      role="menu"
      aria-label={copy.accountMenu}
    >
      <div className="ui-menu-section">
        <div className="ui-menu-label">{toUserLabel(user)}</div>
        <AccountRow
          icon="settings"
          isDisabled={false}
          label={copy.settings}
          onRun={onSettings}
        />
        <AccountRow
          icon="arrowRight"
          isDisabled={isDisabled}
          label={toAuthLabel(isSignedIn, isReady)}
          onRun={onAuth}
        />
      </div>
    </div>
  );
};

export { AccountDropdown };
