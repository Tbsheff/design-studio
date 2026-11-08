import { useCallback } from "react";
import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { isReadOnlyPublication } from "./publish-api.js";
import { RowPublicationButton } from "./row-publication-button.js";
import { RowToggleButton } from "./row-toggle-button.js";

interface Props {
  isBusy: boolean;
  openName: string | null;
  publication: Publication;
  onOpen: (name: string | null) => void;
  onRepublish: (publication: Publication) => void;
  onUnpublish: (publication: Publication) => void;
}

const PublicationRowActions = ({
  isBusy,
  onOpen,
  onRepublish,
  onUnpublish,
  openName,
  publication,
}: Props): ReactElement => {
  const isApp =
    publication.backend === "app" && !isReadOnlyPublication(publication);

  const toggle = useCallback(
    (name: string): void => {
      onOpen(pick(openName === name, null, name));
    },
    [onOpen, openName]
  );

  return (
    <>
      {isApp && publication.versions.length > 1 && (
        <RowToggleButton
          count={publication.versions.length}
          label={copy.versions2}
          name="versions"
          openName={openName}
          tip={copy.versionsTip}
          onToggle={toggle}
        />
      )}
      {isApp &&
        (publication.viewerComments || publication.commentCount > 0) && (
          <RowToggleButton
            count={publication.commentCount}
            label={copy.comments}
            name="comments"
            openName={openName}
            tip={copy.commentsTip}
            onToggle={toggle}
          />
        )}
      {isApp && publication.status === "live" && (
        <RowPublicationButton
          isBusy={isBusy}
          isDanger={false}
          label={copy.republish}
          publication={publication}
          tip={copy.publishTip}
          onAct={onRepublish}
        />
      )}
      <RowPublicationButton
        isBusy={isBusy}
        isDanger
        label={copy.unpublish}
        publication={publication}
        tip={pick(
          isApp,
          "Turns the address off (410) and deletes its files",
          "Deletes the old per-design Cloudflare Worker"
        )}
        onAct={onUnpublish}
      />
    </>
  );
};

export { PublicationRowActions };
