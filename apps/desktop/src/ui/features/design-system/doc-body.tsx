import type { PackDetail } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { Markdown } from "../../ai/components/ai/markdown.js";
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
      <Markdown>{detail.value.designMd}</Markdown>
    </div>
  );
};

export { DocBody };
