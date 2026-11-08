import type { ReactElement } from "react";

import { Markdown } from "../../ai/components/ai/markdown.js";
import { COPY } from "./copy.js";

const DmdPreviewBody = ({ shown }: { shown: string }): ReactElement => {
  if (shown.trim()) {
    return <Markdown>{shown.replaceAll(/<!--[\s\S]*?-->/gu, "")}</Markdown>;
  }

  return <p className="dmd-outline-empty">{COPY.textNothingToShowYet}</p>;
};

export { DmdPreviewBody };
