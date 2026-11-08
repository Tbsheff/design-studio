import type { ReactNode } from "react";

interface VersionLevelBadgeProps {
  readonly level: string;
  readonly text: string;
}

const VersionLevelBadge = ({
  level,
  text,
}: VersionLevelBadgeProps): ReactNode => (
  <>
    <span className="dot" />
    <span className={`version-level ${level}`} data-testid="version-level">
      {text}
    </span>
  </>
);

export { VersionLevelBadge };
