import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import type { AuthoredCss } from "./authored-css-model.js";
import { copy } from "./copy.js";
import { OtherStyleRow } from "./other-style-row.js";
import { getOtherRows } from "./other-styles-model.js";
import { OtherStylesToggle } from "./other-styles-toggle.js";

const InspectorOtherStyles = ({
  css,
}: {
  readonly css: AuthoredCss | null;
}): ReactElement | null => {
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = useCallback(() => setIsOpen((value) => !value), []);
  const rows = getOtherRows(css);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="ins-section ins-other" aria-label={copy.otherStyles}>
      <OtherStylesToggle
        count={rows.length}
        isOpen={isOpen}
        onToggle={handleToggle}
      />
      {isOpen && (
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
      )}
    </section>
  );
};

export { InspectorOtherStyles };
