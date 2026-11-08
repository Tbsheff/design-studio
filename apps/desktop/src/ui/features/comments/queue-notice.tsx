import type { ReactElement } from "react";

import { copy } from "./copy.js";

const QueueNotice = ({
  notice,
}: {
  notice: string | null;
}): ReactElement | null => {
  if (!notice) {
    return null;
  }

  return (
    <span className="notice">
      {" "}
      {copy.textGlyph3}
      {notice}
    </span>
  );
};

export { QueueNotice };
