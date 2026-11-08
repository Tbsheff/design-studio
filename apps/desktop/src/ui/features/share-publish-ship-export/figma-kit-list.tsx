import type { FigmaKitUse } from "@design-studio/contracts/figma-nodes";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const KIT_SHOWN = 6;

interface Props {
  readonly kit: readonly FigmaKitUse[];
}

const FigmaKitList = ({ kit }: Props): ReactElement | null => {
  if (kit.length === 0) {
    return null;
  }

  return (
    <ul className="fgi-kit" aria-label={copy.kitComponents}>
      {kit.slice(0, KIT_SHOWN).map((use) => (
        <li key={`${use.layer}:${use.component}:${use.file}`}>
          <span>{use.layer}</span>
          <code>{`<${use.component}>`}</code>
        </li>
      ))}
    </ul>
  );
};

export { FigmaKitList };
