import type { LinksFile, PrototypeLink } from "@design-studio/contracts/links";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { LinkCountButton } from "./link-count-button.js";
import { LinkList } from "./link-list.js";
import { linksApi } from "./links-api.js";
import { protoCopy } from "./proto-copy.js";
import type { LinkState } from "./use-link-rects.js";
import { useLinkRunner } from "./use-link-runner.js";

interface PrototypeBarLinksProps {
  readonly projectId: string;
  readonly file: LinksFile;
  readonly states: LinkState[];
  readonly toLinkTitle: (link: PrototypeLink) => string;
  readonly onError: (message: string) => void;
}

const PrototypeBarLinks = ({
  projectId,
  file,
  states,
  toLinkTitle,
  onError,
}: PrototypeBarLinksProps): ReactElement => {
  const [isListOpen, setIsListOpen] = useState(false);
  const run = useLinkRunner(onError);

  const handleKeepAll = useCallback(
    (): void => run(() => linksApi.keep(projectId, "all")),
    [projectId, run]
  );

  const handleToggle = useCallback(
    (): void => setIsListOpen((open) => !open),
    []
  );

  const brokenCount = states.filter((state) => state.issue !== null).length;
  const foundCount = states.filter((state) => state.link.implicit).length;
  const savedCount = file.links.length - foundCount;

  return (
    <>
      <span className="topbar-anchor">
        <LinkCountButton
          savedCount={savedCount}
          foundCount={foundCount}
          brokenCount={brokenCount}
          isOpen={isListOpen}
          onToggle={handleToggle}
        />
        {isListOpen && (
          <LinkList
            projectId={projectId}
            states={states}
            toLinkTitle={toLinkTitle}
            onError={onError}
          />
        )}
      </span>
      {foundCount > 0 && (
        <button
          type="button"
          className="btn small ghost"
          data-testid="link-keep-all"
          data-tip={copy.saveTheLinks}
          onClick={handleKeepAll}
        >
          {protoCopy.keepAll}
        </button>
      )}
    </>
  );
};

export { PrototypeBarLinks };
