import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { KeyView } from "./keys-model.js";

interface KeyRowProps {
  readonly isPending: boolean;
  readonly item: KeyView;
  readonly onRevoke: (keyId: string) => void;
}

const toLastUsed = (at: number | null): string => {
  if (at === null) {
    return copy.neverUsed;
  }

  return `${copy.lastUsed} ${new Date(at).toLocaleString("en-US", { timeZone: "UTC" })}`;
};

const KeyRow = ({ isPending, item, onRevoke }: KeyRowProps): ReactElement => {
  const revoke = useCallback((): void => {
    onRevoke(item.keyId);
  }, [item.keyId, onRevoke]);

  return (
    <li>
      <strong>{item.name}</strong>
      <span>{toLastUsed(item.lastUsedAt)}</span>
      <button type="button" disabled={isPending} onClick={revoke}>
        {copy.revoke}
      </button>
    </li>
  );
};

export { KeyRow };
