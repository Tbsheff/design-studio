import type { ReactElement } from "react";

import { ConnectTrustedFolder } from "./connect-trusted-folder.js";

interface ConnectTrustedListProps {
  readonly envOnly: readonly string[];
  readonly isBusy: boolean;
  readonly saved: readonly string[];
  readonly onRemove: (folder: string) => void;
}

const ConnectTrustedList = ({
  envOnly,
  isBusy,
  onRemove,
  saved,
}: ConnectTrustedListProps): ReactElement => (
  <ul className="connect-trusted-list">
    {saved.map((folder) => (
      <ConnectTrustedFolder
        key={folder}
        folder={folder}
        isBusy={isBusy}
        isFromEnv={false}
        onRemove={onRemove}
      />
    ))}
    {envOnly.map((folder) => (
      <ConnectTrustedFolder
        key={folder}
        folder={folder}
        isBusy={isBusy}
        isFromEnv
        onRemove={onRemove}
      />
    ))}
  </ul>
);

export { ConnectTrustedList };
