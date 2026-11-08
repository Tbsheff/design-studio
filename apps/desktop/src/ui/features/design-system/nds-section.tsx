import type { ReactElement, ReactNode } from "react";

import { toChoice } from "./choose-text.js";

const Section = ({
  title,
  hint,
  children,
  isDrop,
}: {
  title: string;
  hint: string | null;
  children: ReactNode;
  isDrop: boolean;
}): ReactElement => (
  <section
    className={toChoice(isDrop, "nds-section nds-section-drop", "nds-section")}
    aria-label={title}
  >
    <div className="nds-section-head">
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
    </div>
    {children}
  </section>
);

export { Section };
