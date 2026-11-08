import type { DraftSourceStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toSeconds } from "./draft-sources-model.js";

const SourceDetail = ({
  source,
}: {
  source: DraftSourceStatus;
}): ReactElement => {
  const time = toSeconds(source);

  return (
    <p className="ds-src-detail">
      {source.detail}
      {source.method === "browser" && (
        <span className="ds-src-time">{copy.readInABrowser}</span>
      )}
      {time && source.state !== "reading" && (
        <span className="ds-src-time">
          {copy.text}
          {time}
        </span>
      )}
    </p>
  );
};

export { SourceDetail };
