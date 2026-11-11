import type { PackDetail } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { MarkdownView } from "./markdown-view.js";
import type { Load } from "./use-load.js";

const DocBody = ({
  detail,
}: {
  detail: Load<PackDetail>;
}): ReactElement | null => {
  if (!detail.value) {
    return null;
  }

  return (
    <div className="lib-doc">
      <MarkdownView>{detail.value.designMd}</MarkdownView>
    </div>
  );
};

export { DocBody };
