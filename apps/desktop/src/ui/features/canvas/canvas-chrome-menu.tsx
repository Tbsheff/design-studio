import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { api } from "../../api.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { UiState } from "../../platform/storage.js";
import {
  FRAME_PRESETS,
  canAddFrame,
  setFrameHidden,
  setFramePath,
} from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import type {
  CanvasShell,
  CommentTool,
  SetSelectMode,
} from "./canvas-shell.js";
import type { CanvasViewRow } from "./canvas-view-row.js";
import { frameBaseName, framePage } from "./frame-label-model.js";
import { toValueOr } from "./settle-model.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";

interface FrameLabelInfo {
  number?: string;
  title?: string;
  badge?: { title: string };
}

interface ChromeImportPage {
  readonly items: (
    kind: string,
    directionId: string | null,
    run: () => void
  ) => MenuEntry[];
  readonly render: (onClose: () => void) => ReactNode;
}

interface ChromeProps {
  matrix?: ReactNode;
  importPage: ChromeImportPage;
  shell: CanvasShell | undefined;
  kind: ProjectKind;
  projectId: string;
  directionId: string | null;
  live: boolean;
  ui: UiState;
  zoom: {
    zoomPercent: LiveStore<number>;
    zoomTo: (zoomValue: number) => void;
    zoomStep: (delta: 1 | -1) => void;
    fit: () => void;
    zoomToActive?: () => void;
  };
  comment: CommentTool;
  selectMode: boolean;
  setSelectMode: SetSelectMode;
  toggleEdit: () => void;
  layout: CanvasLayout;
  active: CanvasFrame;
  frames: {
    update: (fn: (canvasLayout: CanvasLayout) => CanvasLayout) => void;
    activate: (frame: CanvasFrame) => void;
  };
  label: (frame: CanvasFrame) => FrameLabelInfo;
  addFrame: (size: { width: number; height: number }) => void;
  presentUrl: string | null;
  sandbox?: string;
  selection: SelectionContext[];
  stage: () => HTMLElement | null;
  view: Omit<ComponentProps<typeof CanvasViewRow>, "viewport">;
  proto: { on: boolean; set: (on: boolean) => void; play: () => void };
}

const addAndShow = (
  chromeProps: ChromeProps,
  size: { width: number; height: number }
): void => {
  const before = new Set(
    (
      canvasStore.get(chromeProps.projectId)?.frames ??
      chromeProps.layout.frames
    ).map((frame) => frame.id)
  );

  chromeProps.addFrame(size);

  const added = canvasStore
    .get(chromeProps.projectId)
    ?.frames.find((frame) => !before.has(frame.id));

  if (!added) {
    return;
  }

  chromeProps.frames.activate(added);
  chromeProps.zoom.zoomToActive?.();
};

const toPageGroup = (
  chromePropsValue: ChromeProps,
  pages: readonly string[]
): MenuGroup => {
  const current = chromePropsValue.active.path || "index.html";

  return {
    items: pages.map((path) => ({
      checked: current === path,
      icon: "file" as const,
      id: `page-${path}`,
      label: path,
      run: () =>
        chromePropsValue.frames.update((canvasLayoutValue) =>
          setFramePath(canvasLayoutValue, chromePropsValue.active.id, path)
        ),
    })),
    label: "Pages",
  };
};

const toFrameEntry = (
  chromePropsValue: ChromeProps,
  canvasFrame: CanvasFrame,
  index: number
): MenuEntry => {
  const info = chromePropsValue.label(canvasFrame);

  const show = (): void => {
    if (canvasFrame.hidden) {
      chromePropsValue.frames.update((canvasLayout3) =>
        setFrameHidden(canvasLayout3, canvasFrame.id, false)
      );
    }

    chromePropsValue.frames.activate(canvasFrame);
    chromePropsValue.zoom.zoomToActive?.();
  };

  let meta2 = "Hidden";

  if (!canvasFrame.hidden) {
    meta2 = framePage(canvasFrame.path);
  }

  return {
    checked: canvasFrame.id === chromePropsValue.active.id,
    id: `frame-${canvasFrame.id}`,
    label: `${info.number ?? index + 1}  ${info.badge?.title ?? frameBaseName(canvasFrame)}`,
    meta: meta2,
    run: show,
  };
};

const toAddGroup = (
  chromePropsValue: ChromeProps,
  onImport: () => void
): MenuGroup => ({
  items: [
    ...FRAME_PRESETS.map((framePreset) => ({
      disabled: !canAddFrame(chromePropsValue.layout),
      icon: framePreset.preset,
      id: `add-${framePreset.preset}`,
      label: framePreset.label,
      run: () =>
        addAndShow(chromePropsValue, {
          height: framePreset.height,
          width: framePreset.width,
        }),
    })),
    ...chromePropsValue.importPage.items(
      chromePropsValue.kind,
      chromePropsValue.directionId,
      onImport
    ),
  ],
  label: "Add frame",
});

interface FileMenu {
  readonly groups: () => MenuGroup[];
  readonly load: () => Promise<void>;
}

const useFileMenu = (
  chromePropsValue: ChromeProps,
  onImport: () => void
): FileMenu => {
  const [pages, setPages] = useState<string[]>([]);

  const load = async (): Promise<void> => {
    if (chromePropsValue.kind !== "html" || !chromePropsValue.directionId) {
      return;
    }

    const { files } = await toValueOr(
      api.workTreeFiles(
        chromePropsValue.projectId,
        chromePropsValue.directionId
      ),
      { files: [] as string[] }
    );

    setPages(
      files.filter((frameValue) => frameValue.endsWith(".html")).toSorted()
    );
  };

  const groups = (): MenuGroup[] => [
    toPageGroup(chromePropsValue, pages),
    {
      items: chromePropsValue.layout.frames.map((canvasFrame, index) =>
        toFrameEntry(chromePropsValue, canvasFrame, index)
      ),
      label: "Frames",
    },
    toAddGroup(chromePropsValue, onImport),
  ];

  return { groups, load };
};

export { useFileMenu };

export type { ChromeImportPage, ChromeProps };
