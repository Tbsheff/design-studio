import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { protoCopy } from "./proto-copy.js";

const COUNT_ICON = 12;

interface LinkCountButtonProps {
  readonly savedCount: number;
  readonly foundCount: number;
  readonly brokenCount: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const toLinkNoun = (count: number): string => {
  if (count === 1) {
    return protoCopy.link;
  }

  return protoCopy.links;
};

const toCountClass = (brokenCount: number): string => {
  if (brokenCount > 0) {
    return "btn small ghost proto-has-broken";
  }

  return "btn small ghost";
};

const LinkCountButton = ({
  savedCount,
  foundCount,
  brokenCount,
  isOpen,
  onToggle,
}: LinkCountButtonProps): ReactElement => (
  <button
    type="button"
    className={toCountClass(brokenCount)}
    aria-expanded={isOpen}
    onClick={onToggle}
  >
    <Icon name="link" size={COUNT_ICON} />
    {savedCount} {toLinkNoun(savedCount)}
    {foundCount > 0 && (
      <span className="proto-found-count" data-testid="link-found-count">
        {foundCount} {protoCopy.found}
      </span>
    )}
    {brokenCount > 0 && (
      <span className="proto-broken-count">
        {brokenCount} {protoCopy.broken}
      </span>
    )}
  </button>
);

export { LinkCountButton };
