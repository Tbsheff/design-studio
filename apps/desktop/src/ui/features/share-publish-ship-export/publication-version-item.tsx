import { useCallback } from "react";
import type { ReactElement } from "react";

import type { Publication, PublishedVersion } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { SHORT_VERSION, toVersionTimeText } from "./publication-model.js";

interface Props {
  isBusy: boolean;
  publication: Publication;
  version: PublishedVersion;
  onRollback: (publication: Publication, versionId: string) => void;
}

const PublicationVersionItem = ({
  isBusy,
  onRollback,
  publication,
  version,
}: Props): ReactElement => {
  const rollback = useCallback((): void => {
    onRollback(publication, version.id);
  }, [onRollback, publication, version.id]);

  return (
    <li className="publish-version">
      <span className="truncate">
        {toVersionTimeText(version.committedAt)} {copy.versionPrefix}
        {version.sourceVersion.slice(0, SHORT_VERSION)}
        {copy.dot}
        {version.fileCount}
        {copy.files}
      </span>
      {version.live && <span className="publish-live-tag">{copy.live}</span>}
      {!version.live && (
        <button
          type="button"
          className="btn ghost small"
          disabled={isBusy}
          onClick={rollback}
          data-tip={copy.restoreTip}
        >
          {copy.makeLive}
        </button>
      )}
    </li>
  );
};

export { PublicationVersionItem };
