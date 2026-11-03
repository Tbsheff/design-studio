import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import type {
  ProjectKind,
  SelectionContext,
} from "../../../shared/contracts.js";
import { api } from "../../api.js";
import { importPageItems } from "../../canvas-slots.js";
import {
  FRAME_PRESETS,
  canAddFrame,
  canvasStore,
  setFrameHidden,
  setFramePath,
} from "../../canvasFrames.js";
import type { CanvasFrame, CanvasLayout } from "../../canvasFrames.js";
import { frameBaseName, framePage } from "../../components/CanvasFrames.js";
import type { CanvasViewRow } from "../../components/CanvasToolbar.js";
import type { MenuGroup } from "../../components/CanvasTopBar.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { UiState } from "../../storage.js";
import type {
  CanvasShell,
  CommentTool,
  SetSelectMode,
} from "./canvas-shell.js";

interface FrameLabelInfo {
  number?: string;
  title?: string;
  badge?: { title: string };
}

interface ChromeProps {
  matrix?: ReactNode;
  shell: CanvasShell | undefined;
  kind: ProjectKind;
  projectId: string;
  directionId: string | null;
  live: boolean;
  ui: UiState;
  zoom: {
    zoomPercent: LiveStore<number>;
    zoomTo: (z: number) => void;
    zoomStep: (d: 1 | -1) => void;
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
    update: (fn: (l: CanvasLayout) => CanvasLayout) => void;
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

function addAndShow(p: ChromeProps, size: { width: number; height: number }) {
  const before = new Set(
    (canvasStore.get(p.projectId)?.frames ?? p.layout.frames).map(
      (frame) => frame.id
    )
  );

  p.addFrame(size);

  const added = canvasStore
    .get(p.projectId)
    ?.frames.find((frame) => !before.has(frame.id));

  if (!added) {
    return;
  }

  p.frames.activate(added);
  p.zoom.zoomToActive?.();
}

function useFileMenu(p: ChromeProps, onImport: () => void) {
  const [pages, setPages] = useState<string[]>([]);

  const load = () => {
    if (p.kind !== "html" || !p.directionId) {
      return;
    }

    void api
      .workTreeFiles(p.projectId, p.directionId)
      .then(({ files }) =>
        setPages(files.filter((f) => f.endsWith(".html")).sort())
      )
      .catch(() => setPages([]));
  };

  const current = p.active.path || "index.html";

  const groups = (): MenuGroup[] => [
    {
      label: "Pages",
      items: pages.map((path) => ({
        id: `page-${path}`,
        label: path,
        icon: "file" as const,
        checked: current === path,
        run: () => p.frames.update((l) => setFramePath(l, p.active.id, path)),
      })),
    },
    {
      label: "Frames",
      items: p.layout.frames.map((f, i) => {
        const info = p.label(f);

        const show = () => {
          if (f.hidden) {
            p.frames.update((l) => setFrameHidden(l, f.id, false));
          }

          p.frames.activate(f);
          p.zoom.zoomToActive?.();
        };

        return {
          id: `frame-${f.id}`,
          label: `${info.number ?? i + 1}  ${info.badge?.title ?? frameBaseName(f)}`,
          meta: f.hidden ? "Hidden" : framePage(f.path),
          checked: f.id === p.active.id,
          run: show,
        };
      }),
    },
    {
      label: "Add frame",
      items: [
        ...FRAME_PRESETS.map((f) => ({
          id: `add-${f.preset}`,
          label: f.label,
          icon: f.preset,
          disabled: !canAddFrame(p.layout),
          run: () => addAndShow(p, { width: f.width, height: f.height }),
        })),
        ...importPageItems(p.kind, p.directionId, onImport),
      ],
    },
  ];

  return { load, groups };
}

export { useFileMenu };

export type { ChromeProps };
