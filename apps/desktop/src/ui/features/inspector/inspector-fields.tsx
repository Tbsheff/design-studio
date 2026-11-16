import type { ReactElement, ReactNode } from "react";

import { SectionFrame } from "./section-frame.js";

interface SectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly aside?: ReactNode;
  readonly modifier?: string;
  readonly label?: ReactNode;
}

const InspectorSection = ({
  title,
  children,
  aside,
  modifier,
  label,
}: SectionProps): ReactElement => (
  <SectionFrame
    title={title}
    aside={aside}
    modifier={modifier ?? null}
    label={label}
    isOpenFirst
  >
    {children}
  </SectionFrame>
);

export { ColorField } from "./color-field.js";

export { InspectorSection };
