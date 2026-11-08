import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { COPY } from "./copy.js";
import { toVars } from "./preview-model.js";
import { PvTypeRow } from "./pv-type-row.js";

const DISPLAY = "var(--font-display)";
const BODY = "var(--font-body)";

const TYPE_STEPS = [
  { family: DISPLAY, step: "4xl" },
  { family: DISPLAY, step: "2xl" },
  { family: BODY, step: "xl" },
  { family: BODY, step: "base" },
  { family: BODY, step: "sm" },
];

const PvTypeScale = ({
  entries,
}: {
  entries: CompiledTokenEntry[];
}): ReactElement => {
  const vars = useMemo(() => toVars(entries, "light"), [entries]);

  return (
    <section
      className="pv-surface pv-type"
      style={vars}
      aria-label={COPY.labelTypeScale}
    >
      <span className="pv-label">{COPY.textType}</span>
      {TYPE_STEPS.map((row) => (
        <PvTypeRow
          key={row.step}
          family={row.family}
          label={row.step}
          sample={COPY.textTheQuickBrownFox}
          size={`var(--text-${row.step})`}
        />
      ))}
      <PvTypeRow
        family="var(--font-mono)"
        label={COPY.textMono}
        sample={COPY.textConstTokenVarPrimary}
        size="var(--text-sm)"
      />
    </section>
  );
};

export { PvTypeScale };
