import { routes as exportRoutes } from "@design-studio/actions/export/routes";
import type { ExportFileResultWire } from "@design-studio/actions/export/schema";
import type {
  CopyCodeRequest,
  CopyCodeResult,
  EditorId,
  EditorInfo,
  ExportFormat,
  ExportFrame,
  ExportRequest,
  ExportScale,
  ExportScope,
  HandoffRequest,
  HandoffResult,
} from "@design-studio/contracts/export";

import { desktopBridge } from "../../platform/desktop.js";
import { call as callAction, getJson, sendJson } from "../../platform/http.js";
import { readStored, uiStore, writeStored } from "../../platform/storage.js";
import {
  activeFrame,
  canvasStore,
  defaultLayout,
  frameName,
} from "../canvas/canvas-frames-model.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";

const item = (pid: string): string =>
  `/api/projects/${encodeURIComponent(pid)}`;
const PREFS_KEY = "design-studio.export.v1";
const OPEN_EVENT = "studio:open-export";

interface ExportedFile {
  blob: Blob;
  name: string;
  note: string | null;
}

const toExportedFile = (file: ExportFileResultWire): ExportedFile => {
  const raw = atob(file.content);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.codePointAt(index) ?? 0;
  }

  return {
    blob: new Blob([bytes], { type: file.type }),
    name: file.name,
    note: file.note,
  };
};

const exportApi = {
  copyCode: (pid: string, request: CopyCodeRequest): Promise<CopyCodeResult> =>
    callAction(exportRoutes.getCodeExport, {
      directionId: request.directionId ?? null,
      format: request.format,
      height: request.frame.height,
      projectId: pid,
      targetSelector: request.selector,
      versionId: request.versionId ?? null,
      width: request.frame.width,
      ...(request.frame.path ? { path: request.frame.path } : {}),
    }),
  editors: async (): Promise<EditorInfo[]> =>
    (await getJson<EditorInfo[]>("/api/editors")) ?? [],
  exportFile: async (
    pid: string,
    request: ExportRequest
  ): Promise<ExportedFile> =>
    toExportedFile(
      await callAction(exportRoutes.exportExport, {
        format: request.format,
        frames: request.frames,
        projectId: pid,
        scale: request.scale,
        scope: request.scope,
        selector: request.selector ?? null,
        versionId: request.versionId,
      })
    ),
  handoff: (pid: string, request: HandoffRequest): Promise<HandoffResult> =>
    callAction(exportRoutes.exportHandoffExport, {
      frames: request.frames,
      projectId: pid,
      versionId: request.versionId,
    }),
  handoffZip: async (pid: string, folder: string): Promise<ExportedFile> =>
    toExportedFile(
      await callAction(exportRoutes.getHandoffExport, {
        folder,
        projectId: pid,
      })
    ),
  openInEditor: async (
    pid: string,
    did: string,
    editor: EditorId,
    file?: string
  ): Promise<void> => {
    await sendJson(
      "POST",
      `${item(pid)}/d/${encodeURIComponent(did)}/open-in-editor`,
      file ? { editor, file } : { editor }
    );
  },
  revealHandoff: async (pid: string, folder: string): Promise<void> => {
    await sendJson(
      "POST",
      `${item(pid)}/handoff/${encodeURIComponent(folder)}/reveal`,
      {}
    );
  },
};

interface ExportPrefs {
  format: ExportFormat;
  scale: ExportScale;
  scope: ExportScope;
}

const DEFAULT_PREFS: ExportPrefs = { format: "png", scale: 2, scope: "page" };

const FORMATS: ReadonlySet<ExportFormat> = new Set<ExportFormat>([
  "png",
  "pdf",
  "html",
  "zip",
  "handoff",
  "svg",
  "pptx",
]);

const readExportPrefs = (): ExportPrefs => {
  try {
    const raw = JSON.parse(
      readStored(PREFS_KEY) ?? "{}"
    ) as Partial<ExportPrefs>;

    return {
      format: FORMATS.has(raw.format as ExportFormat)
        ? (raw.format as ExportFormat)
        : DEFAULT_PREFS.format,
      scale:
        raw.scale === 1 || raw.scale === 2 || raw.scale === 3
          ? raw.scale
          : DEFAULT_PREFS.scale,
      scope: raw.scope === "frame" ? "frame" : "page",
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

const saveExportPrefs = (prefs: ExportPrefs): void => {
  writeStored(PREFS_KEY, JSON.stringify(prefs));
};

interface FrameChoice {
  id: string;
  frame: ExportFrame;
  active: boolean;
}

const toExport = (
  frame: CanvasFrame,
  name = frame.label?.trim() || frameName(frame)
): ExportFrame => ({
  height: frame.height,
  name,
  width: frame.width,
  ...(frame.path ? { path: frame.path } : {}),
});

const frameRoute = (frame: ExportFrame): string =>
  `/${(frame.path ?? "").replace(/^\/+/, "")}`;

const choiceNames = (frames: CanvasFrame[]): string[] => {
  const names = frames.map((frame) => toExport(frame).name);

  return names.map((name, index) =>
    names.filter((other) => other === name).length < 2
      ? name
      : `Frame ${index + 1}`
  );
};

const canvasFrameChoices = (
  projectId: string,
  directionId: string | null
): FrameChoice[] => {
  const layout =
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);

  const active = activeFrame(layout);

  const own = layout.frames.filter(
    (frame) => !frame.directionId || frame.directionId === directionId
  );

  const list = own.length > 0 ? own : [active];
  const names = choiceNames(list);

  return list.map((frame, index) => ({
    active: frame.id === active.id,
    frame: toExport(frame, names[index]),
    id: frame.id,
  }));
};

const activeExportFrame = (projectId: string): ExportFrame =>
  toExport(
    activeFrame(
      canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport)
    )
  );

interface ExportTarget {
  projectId: string;
  directionId: string | null;
  versionId: string;
  versionLabel: string;
  selector?: string;
  format?: ExportFormat;
}

interface OpenExportDetail {
  versionId?: string;
  format?: ExportFormat;
  selector?: string;
}

const openExport = (detail: OpenExportDetail = {}): void => {
  globalThis.dispatchEvent(
    new CustomEvent<OpenExportDetail>(OPEN_EVENT, { detail })
  );
};

const onOpenExport = (
  handler: (detail: OpenExportDetail) => void
): (() => void) => {
  const listener = (event: Event): void =>
    handler((event as CustomEvent<OpenExportDetail>).detail ?? {});

  globalThis.addEventListener(OPEN_EVENT, listener);

  return () => globalThis.removeEventListener(OPEN_EVENT, listener);
};

interface RevealBridge {
  revealExport?: () => void;
}

const canRevealDownload = (): boolean =>
  typeof desktopBridge<RevealBridge>()?.revealExport === "function";

const revealDownload = (): void => {
  desktopBridge<RevealBridge>()?.revealExport?.();
};

export {
  exportApi,
  readExportPrefs,
  saveExportPrefs,
  frameRoute,
  canvasFrameChoices,
  activeExportFrame,
  openExport,
  onOpenExport,
  canRevealDownload,
  revealDownload,
};

export type {
  ExportedFile,
  ExportPrefs,
  FrameChoice,
  ExportTarget,
  OpenExportDetail,
};
