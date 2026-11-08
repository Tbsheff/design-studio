import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface SectionToggleProps {
  readonly hasBody: boolean;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly title: string;
}

const SectionToggle = ({
  hasBody,
  isOpen,
  onToggle,
  title,
}: SectionToggleProps): ReactElement => (
  <button
    type="button"
    className="ins-section-toggle"
    aria-expanded={hasBody && isOpen}
    disabled={!hasBody}
    onClick={onToggle}
  >
    <Icon name="chevronRight" size={12} />
    <span>{title}</span>
  </button>
);

export { SectionToggle };
