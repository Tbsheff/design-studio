import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { TweaksProblemList } from "./tweaks-problem-list.js";

const TweaksProblems = ({
  problems,
}: {
  readonly problems: string[];
}): ReactElement | null => {
  if (problems.length === 0) {
    return null;
  }

  return (
    <output className="twk-problems">
      <Icon name="alert" size={13} />
      <TweaksProblemList problems={problems} />
    </output>
  );
};

export { TweaksProblems };
