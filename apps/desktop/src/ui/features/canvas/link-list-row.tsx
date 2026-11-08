import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toRowMeta } from "./link-view.js";
import { linksApi } from "./links-api.js";
import type { LinkState } from "./use-link-rects.js";
import type { LinkRunner } from "./use-link-runner.js";

const ROW_ICON = 12;

interface LinkListRowProps {
  readonly projectId: string;
  readonly state: LinkState;
  readonly title: string;
  readonly run: LinkRunner;
}

const toRowClass = (state: LinkState): string => {
  const parts = ["proto-row"];

  if (state.issue) {
    parts.push("broken");
  }

  if (state.link.implicit) {
    parts.push("implicit");
  }

  return parts.join(" ");
};

const toRowIcon = (state: LinkState): "unlink" | "link" => {
  if (state.issue) {
    return "unlink";
  }

  return "link";
};

const LinkListRow = ({
  projectId,
  state,
  title,
  run,
}: LinkListRowProps): ReactElement => {
  const { link } = state;

  const handleKeep = useCallback(
    (): void => run(() => linksApi.keep(projectId, [link.id])),
    [link.id, projectId, run]
  );

  const handleRemove = useCallback(
    (): void => run(() => linksApi.remove(projectId, link.id)),
    [link.id, projectId, run]
  );

  return (
    <li className={toRowClass(state)}>
      <Icon name={toRowIcon(state)} size={ROW_ICON} />
      <span className="truncate">{title}</span>
      <span className="proto-meta">{toRowMeta(state)}</span>
      {link.implicit && (
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Keep link ${title}`}
          data-tip={copy.keep}
          onClick={handleKeep}
        >
          <Icon name="check" size={ROW_ICON} />
        </button>
      )}
      {!link.implicit && (
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Remove link ${title}`}
          onClick={handleRemove}
        >
          <Icon name="close" size={ROW_ICON} />
        </button>
      )}
    </li>
  );
};

export { LinkListRow };
