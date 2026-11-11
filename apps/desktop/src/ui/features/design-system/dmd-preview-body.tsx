import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { MarkdownView } from "./markdown-view.js";

const DmdPreviewBody = ({ shown }: { shown: string }): ReactElement => {
  if (shown.trim()) {
    return (
      <MarkdownView>{shown.replaceAll(/<!--[\s\S]*?-->/gu, "")}</MarkdownView>
    );
  }

  return <p className="dmd-outline-empty">{COPY.textNothingToShowYet}</p>;
};

export { DmdPreviewBody };
