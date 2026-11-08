import type { ReactElement, ReactNode } from "react";

import { SectionToggle } from "./section-toggle.js";

interface SectionHeadProps {
  readonly aside: ReactNode;
  readonly hasBody: boolean;
  readonly isOpen: boolean;
  readonly label: ReactNode;
  readonly onToggle: () => void;
  readonly title: string;
}

const SectionHead = ({
  aside,
  hasBody,
  isOpen,
  label,
  onToggle,
  title,
}: SectionHeadProps): ReactElement => (
  <div className="ins-section-head">
    <h3>
      <SectionToggle
        hasBody={hasBody}
        isOpen={isOpen}
        onToggle={onToggle}
        title={title}
      />
    </h3>
    {label}
    {aside}
  </div>
);

export { SectionHead };
