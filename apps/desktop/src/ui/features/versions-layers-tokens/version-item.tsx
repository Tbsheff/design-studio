import type { Version } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import { displayTitle } from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";
import { VersionRow } from "./version-row.js";

interface VersionItemProps {
  readonly compareSide: "A" | "B" | null;
  readonly index: VersionIndex;
  readonly isActive: boolean;
  readonly isExpanded: boolean;
  readonly isHead: boolean;
  readonly isLocked: boolean;
  readonly isOpen: boolean;
  readonly isPicked: boolean;
  readonly onBranch: (id: string) => void;
  readonly onExpand: (id: string) => void;
  readonly onExport: (version: Version) => void;
  readonly onOpen: (version: Version, title: string) => void;
  readonly onPolish: () => void;
  readonly onRename: (version: Version, name: string | null) => void;
  readonly onRestore: (version: Version) => void;
  readonly onReview: ((version: Version) => void) | null;
  readonly onToggleCompare: (version: Version) => void;
  readonly projectId: string;
  readonly version: Version;
}

const VersionItem = (props: VersionItemProps): ReactNode => {
  const { index, version } = props;
  const { onBranch, onExpand, onExport, onOpen, onRename } = props;
  const { onRestore, onReview, onToggleCompare } = props;

  const handleExpand = useCallback((): void => {
    onExpand(version.id);
  }, [onExpand, version.id]);

  const handleOpen = useCallback((): void => {
    onOpen(version, displayTitle(version, index));
  }, [index, onOpen, version]);

  const handleOpenVersion = useCallback(
    (target: Version): void => {
      onOpen(target, displayTitle(target, index));
    },
    [index, onOpen]
  );

  const handleRestore = useCallback((): void => {
    onRestore(version);
  }, [onRestore, version]);

  const handleToggleCompare = useCallback((): void => {
    onToggleCompare(version);
  }, [onToggleCompare, version]);

  const handleExport = useCallback((): void => {
    onExport(version);
  }, [onExport, version]);

  const handleBranch = useCallback((): void => {
    onBranch(version.id);
  }, [onBranch, version.id]);

  const handleRename = useCallback(
    (name: string | null): void => {
      onRename(version, name);
    },
    [onRename, version]
  );

  const handleReview = useMemo(() => {
    if (!onReview) {
      return;
    }

    return (): void => onReview(version);
  }, [onReview, version]);

  return (
    <VersionRow
      projectId={props.projectId}
      active={props.isActive}
      version={version}
      index={index}
      isHead={props.isHead}
      isOpen={props.isOpen}
      picked={props.isPicked}
      compareSide={props.compareSide}
      locked={props.isLocked}
      expanded={props.isExpanded}
      onExpand={handleExpand}
      onOpen={handleOpen}
      onOpenVersion={handleOpenVersion}
      onRestore={handleRestore}
      onToggleCompare={handleToggleCompare}
      onExport={handleExport}
      onBranch={handleBranch}
      onPolish={props.onPolish}
      onReview={handleReview}
      onRename={handleRename}
    />
  );
};

export { VersionItem };
