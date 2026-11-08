import type { Version } from "@design-studio/contracts";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { VersionCompareBadge } from "./version-compare-badge.js";
import { autoTitle } from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";
import { VersionRenameField } from "./version-rename-field.js";
import { toControls } from "./version-row-model.js";
import { VersionTitleToggle } from "./version-title-toggle.js";

interface VersionTitleProps {
  readonly compareSide: "A" | "B" | null;
  readonly detailId: string;
  readonly index: VersionIndex;
  readonly isExpanded: boolean;
  readonly isHead: boolean;
  readonly onExpand: () => void;
  readonly onRename: (name: string | null) => void;
  readonly title: string;
  readonly version: Version;
}

const VersionTitle = (props: VersionTitleProps): ReactNode => {
  const { onRename, version } = props;
  const [isRenaming, setIsRenaming] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  const endRename = useCallback((): void => {
    setIsRenaming(false);
    requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
  }, []);

  const handleStartRename = useCallback((): void => {
    setIsRenaming(true);
  }, []);

  const handleCommit = useCallback(
    (name: string | null): void => {
      endRename();
      onRename(name);
    },
    [endRename, onRename]
  );

  return (
    <div className="version-title">
      {isRenaming && (
        <VersionRenameField
          initial={props.title}
          fallback={autoTitle(version, props.index)}
          onCancel={endRename}
          onCommit={handleCommit}
        />
      )}
      {!isRenaming && (
        <VersionTitleToggle
          ref={toggle}
          controls={toControls(props.isExpanded, props.detailId)}
          isExpanded={props.isExpanded}
          tip={version.meta.prompt ?? version.title}
          title={props.title}
          onExpand={props.onExpand}
          onStartRename={handleStartRename}
        />
      )}
      {props.compareSide && <VersionCompareBadge side={props.compareSide} />}
      {props.isHead && <span className="badge accent">{COPY.badgeHead}</span>}
    </div>
  );
};

export { VersionTitle };
