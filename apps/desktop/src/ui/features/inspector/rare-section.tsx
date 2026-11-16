import type { ReactElement, ReactNode } from "react";

import { SectionFrame } from "./section-frame.js";

interface RareSectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly aside: ReactNode;
  readonly modifier: string | null;
}

const RareSection = ({
  title,
  children,
  aside,
  modifier,
}: RareSectionProps): ReactElement => (
  <SectionFrame
    title={title}
    aside={aside}
    modifier={modifier}
    label={null}
    isOpenFirst={false}
  >
    {children}
  </SectionFrame>
);

export { RareSection };
