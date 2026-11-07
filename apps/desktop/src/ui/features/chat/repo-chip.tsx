import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { chipVariants } from "../../ai/components/ai/chip.js";
import { RepoChipLabel } from "./repo-chip-label.js";

interface RepoChipProps {
  readonly isShown: boolean;
  readonly names: string;
  readonly tip: string;
}

const CHIP_CLASS = `${chipVariants({ size: "sm" })} chip max-w-full`;

const RepoChip = ({
  isShown,
  names,
  tip,
}: RepoChipProps): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return (
    <div className="chips repo-context flex flex-wrap gap-1 px-2 pt-2">
      <span className={CHIP_CLASS} data-tip={tip} data-tip-side="top">
        <Icon name="book" size={12} />
        <RepoChipLabel names={names} />
      </span>
    </div>
  );
};

export { RepoChip };
