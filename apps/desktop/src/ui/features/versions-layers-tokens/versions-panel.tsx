import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { DirectionsSection } from "./directions-section.js";
import { useFork } from "./use-fork.js";
import { useVersionNames } from "./use-version-names.js";
import { VersionsEmpty } from "./versions-empty.js";
import { toVersionsHead } from "./versions-head.js";
import { VersionsList } from "./versions-list.js";
import { hasDirectionList, toCompareSides } from "./versions-panel-model.js";
import type { VersionsPanelProps } from "./versions-panel-types.js";

const MIN_UNDO_VERSIONS = 2;

const VersionsPanel = (props: VersionsPanelProps): ReactNode => {
  const { compare, project, versions } = props;
  const { directionId, onRename } = props;

  const direction =
    project.directions.find((entry) => entry.id === directionId) ?? null;

  const fork = useFork(direction?.name ?? null, props.onNewDirection);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { index, rename, sorted } = useVersionNames(versions, onRename ?? null);
  const isLocked = props.busy || props.running;
  const headVersionId = direction?.headVersionId ?? null;
  const sides = toCompareSides(sorted, compare);
  const picked = new Set(compare);
  const { start: handleBranch } = fork;

  const handleNewDirection = useCallback((): void => {
    if (headVersionId) {
      fork.start(headVersionId);
    }
  }, [fork, headVersionId]);

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
        onNewDirection={handleNewDirection}
        onSelectDirection={props.onSelectDirection}
      />
      <section
        className="panel-section grow"
        aria-label={COPY.labelVersionList}
      >
        {toVersionsHead({
          canNewDirection: headVersionId !== null,
          canUndo: !isLocked && sorted.length >= MIN_UNDO_VERSIONS,
          comparing: compare.length === 2,
          count: sorted.length,
          hasMenu: !hasDirectionList(project.directions.length),
          onCompare: props.onCompare,
          onNewDirection: handleNewDirection,
          onUndo: props.onUndo,
        })}
        <VersionsEmpty
          count={sorted.length}
          isLoading={headVersionId !== null}
        />
        <VersionsList
          expanded={expanded}
          headVersionId={headVersionId}
          index={index}
          isLocked={isLocked}
          panel={props}
          picked={picked}
          sides={sides}
          sorted={sorted}
          onBranch={handleBranch}
          onExpand={handleExpand}
          onRename={rename}
        />
      </section>
    </div>
  );
};

export { VersionsPanel };

export type { VersionsPanelProps } from "./versions-panel-types.js";
