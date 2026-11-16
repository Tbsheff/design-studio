import type { ReactElement, ReactNode } from "react";

import { SectionHead } from "./section-head.js";
import { useSectionOpen } from "./use-section-open.js";

interface SectionFrameProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly aside: ReactNode;
  readonly modifier: string | null;
  readonly label: ReactNode;
  readonly isOpenFirst: boolean;
}

const toSectionClass = (isOpen: boolean, modifier: string | null): string => {
  if (isOpen) {
    return `ins-section  ${modifier ?? ""}`;
  }

  return `ins-section closed ${modifier ?? ""}`;
};

const SectionFrame = ({
  title,
  children,
  aside,
  modifier,
  label,
  isOpenFirst,
}: SectionFrameProps): ReactElement => {
  const [isOpen, toggle] = useSectionOpen(title, isOpenFirst);
  const hasBody = Boolean(children);

  return (
    <section className={toSectionClass(isOpen, modifier)} aria-label={title}>
      <SectionHead
        aside={aside}
        hasBody={hasBody}
        isOpen={isOpen}
        label={label}
        onToggle={toggle}
        title={title}
      />
      {isOpen && children}
    </section>
  );
};

export { SectionFrame };

export type { SectionFrameProps };
