import type { PrototypeLink } from "@design-studio/contracts/links";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { LinkListRow } from "./link-list-row.js";
import { protoCopy } from "./proto-copy.js";
import type { LinkState } from "./use-link-rects.js";
import { useLinkRunner } from "./use-link-runner.js";

interface LinkListProps {
  readonly projectId: string;
  readonly states: LinkState[];
  readonly toLinkTitle: (link: PrototypeLink) => string;
  readonly onError: (message: string) => void;
}

const LinkList = ({
  projectId,
  states,
  toLinkTitle,
  onError,
}: LinkListProps): ReactElement => {
  const run = useLinkRunner(onError);

  return (
    <ul
      className="proto-list ui-popover"
      aria-label={copy.prototypeLinks}
      data-testid="link-list"
    >
      {states.length === 0 && (
        <li className="proto-empty">{protoCopy.noLinks}</li>
      )}
      {states.map((state) => (
        <LinkListRow
          key={state.link.id}
          projectId={projectId}
          state={state}
          title={toLinkTitle(state.link)}
          run={run}
        />
      ))}
    </ul>
  );
};

export { LinkList };
