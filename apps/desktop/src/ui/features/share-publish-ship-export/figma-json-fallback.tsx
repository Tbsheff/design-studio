import type { FigmaImportSource } from "@design-studio/contracts/figma-nodes";
import type { ReactElement } from "react";

import { LINKS_OFF } from "./figma-import-model.js";
import { FigmaJsonPaste } from "./figma-json-paste.js";

interface Props {
  readonly base: FigmaImportSource;
  readonly failure: string | null;
  readonly onUse: (nodes: string) => void;
}

const FigmaJsonFallback = ({
  base,
  failure,
  onUse,
}: Props): ReactElement | null => {
  if (!failure || !("link" in base) || !LINKS_OFF.test(failure)) {
    return null;
  }

  return <FigmaJsonPaste link={base.link} onUse={onUse} />;
};

export { FigmaJsonFallback };
