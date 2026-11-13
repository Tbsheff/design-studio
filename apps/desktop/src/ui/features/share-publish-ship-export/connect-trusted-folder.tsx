import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { trustedCopy } from "./copy.js";

const ICON_SIZE = 12;

interface ConnectTrustedFolderProps {
  readonly folder: string;
  readonly isBusy: boolean;
  readonly isFromEnv: boolean;
  readonly onRemove: (folder: string) => void;
}

const ConnectTrustedFolder = ({
  folder,
  isBusy,
  isFromEnv,
  onRemove,
}: ConnectTrustedFolderProps): ReactElement => {
  const removeFolder = useCallback((): void => {
    onRemove(folder);
  }, [folder, onRemove]);

  return (
    <li className="connect-trusted-folder" data-testid="connect-trusted-folder">
      <Icon name="folder" size={ICON_SIZE} />
      <code data-tip={folder}>{folder}</code>
      {isFromEnv && (
        <span className="connect-trusted-tag">{trustedCopy.envTag}</span>
      )}
      {!isFromEnv && (
        <button
          type="button"
          className="btn small ghost icon-only"
          aria-label={`${trustedCopy.remove} ${folder}`}
          data-tip={trustedCopy.remove}
          disabled={isBusy}
          onClick={removeFolder}
        >
          <Icon name="close" size={ICON_SIZE} />
        </button>
      )}
    </li>
  );
};

export { ConnectTrustedFolder };
