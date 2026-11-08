import type { Version } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { useHeadFocus } from "./use-head-focus.js";
import { VersionItem } from "./version-item.js";
import type { VersionIndex } from "./version-labels.js";
import type { VersionsPanelProps } from "./versions-panel-types.js";

interface Props {
  readonly expanded: string | null;
  readonly headVersionId: string | null;
  readonly index: VersionIndex;
  readonly isLocked: boolean;
  readonly panel: VersionsPanelProps;
  readonly picked: ReadonlySet<string>;
  readonly sides: ReadonlyMap<string, "A" | "B">;
  readonly sorted: Version[];
  readonly onBranch: (id: string) => void;
  readonly onExpand: (id: string) => void;
  readonly onRename: (version: Version, name: string | null) => void;
}

const toFocusId = (
  hasHead: boolean,
  headVersionId: string | null
): string | null => {
  if (hasHead) {
    return headVersionId;
  }

  return null;
};

const VersionsList = (props: Props): ReactNode => {
  const { headVersionId, panel, picked, sides, sorted } = props;
  const hasHead = sorted.some((version) => version.id === headVersionId);
  const listRef = useHeadFocus(toFocusId(hasHead, headVersionId));
  const { onExport, onOpen, onPolish, onRestore, onToggleCompare } = panel;

  return (
    <ul className="list versions" ref={listRef}>
      {sorted.map((version) => (
        <VersionItem
          key={version.id}
          compareSide={sides.get(version.id) ?? null}
          index={props.index}
          isActive={panel.active ?? true}
          isExpanded={props.expanded === version.id}
          isHead={version.id === headVersionId}
          isLocked={props.isLocked}
          isOpen={panel.openVersionId === version.id}
          isPicked={picked.has(version.id)}
          projectId={panel.project.id}
          version={version}
          onBranch={props.onBranch}
          onExpand={props.onExpand}
          onExport={onExport}
          onOpen={onOpen}
          onPolish={onPolish}
          onRename={props.onRename}
          onRestore={onRestore}
          onReview={panel.onReview ?? null}
          onToggleCompare={onToggleCompare}
        />
      ))}
    </ul>
  );
};

export { VersionsList };
