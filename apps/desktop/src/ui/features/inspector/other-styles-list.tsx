import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { OtherStyleRow } from "./other-style-row.js";
import type { getOtherRows } from "./other-styles-model.js";
import { RareSection } from "./rare-section.js";

type OtherRows = ReturnType<typeof getOtherRows>;

const OtherStylesList = ({
  rows,
}: {
  readonly rows: OtherRows;
}): ReactElement => {
  const count = useMemo(
    () => <span className="ins-other-count">{rows.length}</span>,
    [rows.length]
  );

  return (
    <RareSection title={copy.otherStyles} aside={count} modifier="ins-other">
      <ul className="ins-other-list">
        {rows.map((row) => (
          <OtherStyleRow
            key={row.prop}
            prop={row.prop}
            source={row.source}
            value={row.value}
          />
        ))}
      </ul>
    </RareSection>
  );
};

export { OtherStylesList };
