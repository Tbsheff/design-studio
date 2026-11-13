import type { WireOutput } from "@design-studio/actions/_core/action";
import type { inspectSourcePage } from "@design-studio/actions/page/inspect-source";
import type { IconName } from "@design-studio/ui";

import type { CanvasFrame } from "./canvas-layout-types.js";
import { copy } from "./copy.js";

type PageSourceWire = WireOutput<typeof inspectSourcePage>;

interface RouteSourceInput {
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

const HTML_PAGE = /\.html?$/u;

const toPageFile = (path: string | null): string | null => {
  if (path === null) {
    return null;
  }

  const file = path.split(/[?#]/u)[0]?.replace(/^\/+/u, "") ?? "";

  if (!HTML_PAGE.test(file)) {
    return null;
  }

  return file;
};

const toRouteSourceInput = (
  projectId: string,
  directionId: string | null,
  path: string | null
): RouteSourceInput | null => {
  const file = toPageFile(path);

  if (directionId === null || file === null) {
    return null;
  }

  return { directionId, file, projectId };
};

const toChangedName = (
  item: PageSourceWire["changedFiles"][number]
): string => {
  if (item.change === "deleted") {
    return `${item.file}${copy.appFileDeleted}`;
  }

  return item.file;
};

const toRouteSourceTip = (source: PageSourceWire | null): string => {
  const items = source?.changedFiles ?? [];
  const names = items.map((item) => toChangedName(item)).join(", ");

  if (items.length === 1) {
    return `${copy.appFileChanged}${names}`;
  }

  return `${items.length}${copy.appFilesChanged}${names}`;
};

const isRouteSourceChanged = (source: PageSourceWire | null): boolean =>
  source?.isRouteCopy === true && source.isChanged;

const toCopyStem = (file: string): string =>
  `${file.replace(HTML_PAGE, "")}-app`;

const toCopyFrame = (
  frames: readonly CanvasFrame[],
  file: string
): CanvasFrame | null => {
  const stem = toCopyStem(file);

  const copies = frames.filter((frame) =>
    (toPageFile(frame.path ?? null) ?? "").startsWith(stem)
  );

  return copies.at(-1) ?? null;
};

const toFrameById = (
  frames: readonly CanvasFrame[],
  frameId: string | null
): CanvasFrame | null => {
  if (frameId === null) {
    return null;
  }

  return frames.find((frame) => frame.id === frameId) ?? null;
};

const toRouteMergePrompt = (file: string): string =>
  [
    copy.routeMerge.promptStart,
    file,
    copy.routeMerge.promptMiddle,
    file,
    copy.routeMerge.promptEnd,
  ].join("");

interface RouteSourceMenuEntry {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface RouteSourceMenuSetup {
  readonly hasCopyFrame: boolean;
  readonly isRunning: boolean;
  readonly handleCompare: () => void;
  readonly handleCopy: () => void;
  readonly handleMark: () => void;
  readonly handleUpdate: () => void;
}

const toUpdateEntry = (setup: RouteSourceMenuSetup): RouteSourceMenuEntry => {
  const entry = {
    icon: "sparkle" as const,
    id: "update-with-ai",
    label: copy.routeMerge.updateWithAi,
    run: setup.handleUpdate,
  };

  if (setup.isRunning) {
    return { ...entry, disabled: copy.routeMerge.running };
  }

  return entry;
};

const toCompareEntries = (
  setup: RouteSourceMenuSetup
): RouteSourceMenuEntry[] => {
  if (!setup.hasCopyFrame) {
    return [];
  }

  return [
    {
      icon: "compare",
      id: "compare-app-copy",
      label: copy.compareAppCopy,
      run: setup.handleCompare,
    },
  ];
};

const toRouteSourceEntries = (
  setup: RouteSourceMenuSetup
): RouteSourceMenuEntry[] => [
  {
    icon: "reload",
    id: "copy-app-again",
    label: copy.copyAppAgain,
    run: setup.handleCopy,
  },
  ...toCompareEntries(setup),
  toUpdateEntry(setup),
  {
    icon: "check",
    id: "mark-as-current",
    label: copy.routeMerge.markCurrent,
    run: setup.handleMark,
  },
];

export {
  isRouteSourceChanged,
  toCopyFrame,
  toFrameById,
  toRouteMergePrompt,
  toRouteSourceInput,
  toRouteSourceTip,
  toRouteSourceEntries,
};

export type {
  PageSourceWire,
  RouteSourceInput,
  RouteSourceMenuEntry,
  RouteSourceMenuSetup,
};
