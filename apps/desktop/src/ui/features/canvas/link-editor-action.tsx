import type { PrototypeLink } from "@design-studio/contracts/links";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { linksApi } from "./links-api.js";
import { protoCopy } from "./proto-copy.js";
import type { LinkRunner } from "./use-link-runner.js";

const REMOVE_ICON = 14;

interface LinkEditorActionProps {
  readonly projectId: string;
  readonly link: PrototypeLink;
  readonly run: LinkRunner;
}

const LinkEditorAction = ({
  projectId,
  link,
  run,
}: LinkEditorActionProps): ReactElement => {
  const handleKeep = useCallback(
    (): void => run(() => linksApi.keep(projectId, [link.id])),
    [link.id, projectId, run]
  );

  const handleRemove = useCallback(
    (): void => run(() => linksApi.remove(projectId, link.id)),
    [link.id, projectId, run]
  );

  if (link.implicit) {
    return (
      <button
        type="button"
        className="btn small"
        data-testid="link-keep"
        onClick={handleKeep}
      >
        {protoCopy.keep}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.removeLink}
      data-tip={copy.removeLink}
      onClick={handleRemove}
    >
      <Icon name="unlink" size={REMOVE_ICON} />
    </button>
  );
};

export { LinkEditorAction };
