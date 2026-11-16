import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { SectionHead } from "./section-head.js";
import { useSectionOpen } from "./use-section-open.js";

interface MoreSectionsProps {
  readonly children: ReactNode;
}

const toMoreClass = (isOpen: boolean): string => {
  if (isOpen) {
    return "ins-section ins-more";
  }

  return "ins-section ins-more closed";
};

const MoreSections = ({ children }: MoreSectionsProps): ReactElement => {
  const [isOpen, toggle] = useSectionOpen(copy.more, false);

  return (
    <section className={toMoreClass(isOpen)} aria-label={copy.more}>
      <SectionHead
        aside={null}
        hasBody
        isOpen={isOpen}
        label={null}
        onToggle={toggle}
        title={copy.more}
      />
      {isOpen && children}
    </section>
  );
};

export { MoreSections };
