import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { DirectionsSection } from "./directions-section.js";
import { useFork } from "./use-fork.js";
import { useHeadFocus } from "./use-head-focus.js";
import { useVersionNames } from "./use-version-names.js";
import { VersionItem } from "./version-item.js";
import { VersionsEmpty } from "./versions-empty.js";
import { toVersionsHead } from "./versions-head.js";
import { toCompareSides } from "./versions-panel-model.js";
import type { VersionsPanelProps } from "./versions-panel-types.js";

const MIN_UNDO_VERSIONS = 2;

const VersionsPanel = (props: VersionsPanelProps): ReactNode => {
  const { compare, project, versions } = props;
  const { directionId, onRename, onReview } = props;

  const direction =
    project.directions.find((entry) => entry.id === directionId) ?? null;

  const fork = useFork(direction?.name ?? null, props.onNewDirection);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { index, rename, sorted } = useVersionNames(versions, onRename ?? null);
  const isLocked = props.busy || props.running;
  const headVersionId = direction?.headVersionId ?? null;
  const hasHead = sorted.some((version) => version.id === headVersionId);
  const listRef = useHeadFocus(headVersionId && hasHead ? headVersionId : null);
  const sides = toCompareSides(sorted, compare);
  const { start: handleBranch } = fork;

  const handleExpand = useCallback((id: string): void => {
    setExpanded((current) => {
      if (current === id) {
        return null;
      }

      return id;
    });
  }, []);

  return (
    <div className="versions-pane">
      <DirectionsSection
        project={project}
        directionId={directionId}
        headVersionId={headVersionId}
        index={index}
        fork={fork}
        onSelectDirection={props.onSelectDirection}
      />
      <section
        className="panel-section grow"
        aria-label={COPY.labelVersionList}
      >
        {toVersionsHead({
          canUndo: !isLocked && sorted.length >= MIN_UNDO_VERSIONS,
          comparing: compare.length === 2,
          count: sorted.length,
          onCompare: props.onCompare,
          onUndo: props.onUndo,
        })}
        <VersionsEmpty
          count={sorted.length}
          isLoading={headVersionId !== null}
        />
        <ul className="list versions" ref={listRef}>
          {sorted.map((version) => (
            <VersionItem
              key={version.id}
              compareSide={sides.get(version.id) ?? null}
              index={index}
              isActive={props.active ?? true}
              isExpanded={expanded === version.id}
              isHead={version.id === headVersionId}
              isLocked={isLocked}
              isOpen={props.openVersionId === version.id}
              isPicked={compare.includes(version.id)}
              projectId={project.id}
              version={version}
              onBranch={handleBranch}
              onExpand={handleExpand}
              onExport={props.onExport}
              onOpen={props.onOpen}
              onPolish={props.onPolish}
              onRename={rename}
              onRestore={props.onRestore}
              onReview={onReview ?? null}
              onToggleCompare={props.onToggleCompare}
            />
          ))}
        </ul>
      </section>
    </div>
  );
};

export { VersionsPanel };

export type { VersionsPanelProps } from "./versions-panel-types.js";
