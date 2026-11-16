import type { ReactElement } from "react";

import type { AuthoredCss } from "./authored-css-model.js";
import { OtherStylesList } from "./other-styles-list.js";
import { getOtherRows } from "./other-styles-model.js";

const InspectorOtherStyles = ({
  css,
}: {
  readonly css: AuthoredCss | null;
}): ReactElement | null => {
  const rows = getOtherRows(css);

  if (rows.length === 0) {
    return null;
  }

  return <OtherStylesList rows={rows} />;
};

export { InspectorOtherStyles };
