import type { ReactElement, ReactNode } from "react";

import { SectionHead } from "./section-head.js";
import { useSectionOpen } from "./use-section-open.js";

interface SectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly aside?: ReactNode;
  readonly modifier?: string;
  readonly label?: ReactNode;
}

const toSectionClass = (isOpen: boolean, modifier: string | null): string => {
  if (isOpen) {
    return `ins-section  ${modifier ?? ""}`;
  }

  return `ins-section closed ${modifier ?? ""}`;
};

const InspectorSection = ({
  title,
  children,
  aside,
  modifier,
  label,
}: SectionProps): ReactElement => {
  const [isOpen, toggle] = useSectionOpen(title, true);
  const hasBody = Boolean(children);

  return (
    <section
      className={toSectionClass(isOpen, modifier ?? null)}
      aria-label={title}
    >
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

export { ColorField } from "./color-field.js";

export { InspectorSection };
