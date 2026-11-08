import type { Version } from "@design-studio/contracts";

import { COPY } from "./copy.js";
import type { MoreItem, VersionRowProps } from "./version-row-types.js";

const FILE_TIP_MAX = 20;

const toFileCount = (version: Version): number =>
  Math.max(version.changedFilesTotal ?? 0, version.changedFiles.length);

const toFileLabel = (count: number): string => {
  if (count === 1) {
    return `${count} file`;
  }

  return `${count} files`;
};

const toFilesTip = (version: Version): string => {
  const more = toFileCount(version) - version.changedFiles.length;

  if (more > 0) {
    const shown = version.changedFiles.slice(0, FILE_TIP_MAX).join("\n");

    return `${shown}\nand ${more} more`;
  }

  return version.changedFiles.join("\n");
};

const toRowClass = (props: VersionRowProps): string => {
  const flags = {
    expanded: props.expanded,
    head: props.isHead,
    picked: props.picked,
    selected: props.isOpen,
  };

  const names = ["version"];

  for (const [name, isOn] of Object.entries(flags)) {
    if (isOn) {
      names.push(name);
    }
  }

  return names.join(" ");
};

const toMoreItems = (
  props: VersionRowProps,
  openCompareInCode: () => void
): MoreItem[] => {
  const { isHead, onReview, version } = props;
  const items: MoreItem[] = [];

  if (onReview && version.parentId !== null) {
    items.push({
      hint: null,
      icon: "code",
      id: "review",
      label: COPY.menuReview,
      run: () => {
        openCompareInCode();
        onReview();
      },
    });
  }

  items.push(
    {
      hint: null,
      icon: "download",
      id: "export",
      label: COPY.menuExport,
      run: props.onExport,
    },
    {
      hint: null,
      icon: "branch",
      id: "branch",
      label: COPY.menuBranch,
      run: props.onBranch,
    }
  );

  if (isHead && version.meta.level !== "polish") {
    let hint: string | null = null;

    if (props.locked) {
      hint = COPY.menuWaitForRun;
    }

    items.push({
      hint,
      icon: "sparkle",
      id: "polish",
      label: COPY.menuPolish,
      run: props.onPolish,
    });
  }

  return items;
};

const toMenuTestId = (id: string): string | undefined => {
  if (id === "review") {
    return "version-review-changes";
  }

  if (id === "polish") {
    return "version-polish-this";
  }
};

const toControls = (isExpanded: boolean, id: string): string | undefined => {
  if (isExpanded) {
    return id;
  }
};

export {
  toControls,
  toFileCount,
  toFileLabel,
  toFilesTip,
  toMenuTestId,
  toMoreItems,
  toRowClass,
};
