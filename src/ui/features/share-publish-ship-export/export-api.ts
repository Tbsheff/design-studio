import { routes as exportRoutes } from "../../../shared/actions/export/routes.js";
import type { ExportFileResultWire } from "../../../shared/actions/export/schema.js";
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
} from "../../../shared/export.js";
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

const p = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;
const PREFS_KEY = "design-studio.export.v1";
const OPEN_EVENT = "studio:open-export";

export interface ExportedFile {
  blob: Blob;
  name: string;
  note: string | null;
}

function toExportedFile(file: ExportFileResultWire): ExportedFile {
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
}

export const exportApi = {
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
      `${p(pid)}/d/${encodeURIComponent(did)}/open-in-editor`,
      file ? { editor, file } : { editor }
    );
  },
  revealHandoff: async (pid: string, folder: string): Promise<void> => {
    await sendJson(
      "POST",
      `${p(pid)}/handoff/${encodeURIComponent(folder)}/reveal`,
      {}
    );
  },
};

export interface ExportPrefs {
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

export function readExportPrefs(): ExportPrefs {
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
}

export function saveExportPrefs(prefs: ExportPrefs): void {
  writeStored(PREFS_KEY, JSON.stringify(prefs));
}

export interface FrameChoice {
  id: string;
  frame: ExportFrame;
  active: boolean;
}

function toExport(
  frame: CanvasFrame,
  name = frame.label?.trim() || frameName(frame)
): ExportFrame {
  return {
    height: frame.height,
    name,
    width: frame.width,
    ...(frame.path ? { path: frame.path } : {}),
  };
}

export function frameRoute(frame: ExportFrame): string {
  return `/${(frame.path ?? "").replace(/^\/+/, "")}`;
}

function choiceNames(frames: CanvasFrame[]): string[] {
  const names = frames.map((frame) => toExport(frame).name);

  return names.map((name, index) =>
    names.filter((other) => other === name).length < 2
      ? name
      : `Frame ${index + 1}`
  );
}

export function canvasFrameChoices(
  projectId: string,
  directionId: string | null
): FrameChoice[] {
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
}

export function activeExportFrame(projectId: string): ExportFrame {
  return toExport(
    activeFrame(
      canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport)
    )
  );
}

export interface ExportTarget {
  projectId: string;
  directionId: string | null;
  versionId: string;
  versionLabel: string;
  selector?: string;
  format?: ExportFormat;
}

export interface OpenExportDetail {
  versionId?: string;
  format?: ExportFormat;
  selector?: string;
}

export function openExport(detail: OpenExportDetail = {}): void {
  window.dispatchEvent(
    new CustomEvent<OpenExportDetail>(OPEN_EVENT, { detail })
  );
}

export function onOpenExport(
  handler: (detail: OpenExportDetail) => void
): () => void {
  const listener = (event: Event) =>
    handler((event as CustomEvent<OpenExportDetail>).detail ?? {});

  window.addEventListener(OPEN_EVENT, listener);

  return () => window.removeEventListener(OPEN_EVENT, listener);
}

interface RevealBridge {
  revealExport?: () => void;
}

export function canRevealDownload(): boolean {
  return typeof desktopBridge<RevealBridge>()?.revealExport === "function";
}

export function revealDownload(): void {
  desktopBridge<RevealBridge>()?.revealExport?.();
}
