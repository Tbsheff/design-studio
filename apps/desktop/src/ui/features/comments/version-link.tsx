import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";

const SHORT_VERSION = 7;

const VersionLink = ({
  onOpenVersion,
  versionId,
}: {
  onOpenVersion: (versionId: string) => void;
  versionId: string;
}): ReactElement => {
  const open = useCallback((): void => {
    onOpenVersion(versionId);
  }, [onOpenVersion, versionId]);

  return (
    <>
      {" · "}
      <button type="button" onClick={open} data-testid="comment-version-link">
        {copy.textVersion}
        {versionId.slice(0, SHORT_VERSION)}
      </button>
    </>
  );
};

export { VersionLink };
