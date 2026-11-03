import { routes as exportRoutes } from "../shared/actions/export/routes.js";
import type { ExportFileResultWire } from "../shared/actions/export/schema.js";
import { STUDIO_TOKEN_HEADER } from "../shared/contracts";
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
  McpStatus,
} from "../shared/export";
import {
  activeFrame,
  canvasStore,
  defaultLayout,
  frameName,
  type CanvasFrame,
} from "./canvasFrames";
import { desktopBridge } from "./platform/desktop";
import { call as callAction } from "./platform/http";
import { getSession } from "./session";
import { uiStore } from "./storage";

const p = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;
const PREFS_KEY = "design-studio.export.v1";
const OPEN_EVENT = "studio:open-export";

async function call(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = {
    [STUDIO_TOKEN_HEADER]: getSession().token,
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const res = await fetch(path, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(parsed?.error ?? `${res.status} ${res.statusText}`);
  }

  return res;
}

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
  revealHandoff: async (pid: string, folder: string): Promise<void> => {
    await call(
      "POST",
      `${p(pid)}/handoff/${encodeURIComponent(folder)}/reveal`
    );
  },
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
    (await (await call("GET", "/api/editors")).json()) as EditorInfo[],
  openInEditor: async (
    pid: string,
    did: string,
    editor: EditorId,
    file?: string
  ): Promise<void> => {
    await call(
      "POST",
      `${p(pid)}/d/${encodeURIComponent(did)}/open-in-editor`,
      file ? { editor, file } : { editor }
    );
  },
  mcpStatus: async (): Promise<McpStatus> =>
    (await (await call("GET", "/api/mcp")).json()) as McpStatus,
  setMcp: async (input: {
    enabled?: boolean;
    edits?: boolean;
    rotate?: boolean;
  }): Promise<McpStatus> =>
    (await (await call("POST", "/api/mcp", input)).json()) as McpStatus,
};

export interface ExportPrefs {
  format: ExportFormat;
  scale: ExportScale;
  scope: ExportScope;
}

const DEFAULT_PREFS: ExportPrefs = { format: "png", scale: 2, scope: "page" };

const FORMATS: ExportFormat[] = [
  "png",
  "pdf",
  "html",
  "zip",
  "handoff",
  "svg",
  "pptx",
];

export function readExportPrefs(): ExportPrefs {
  try {
    const raw = JSON.parse(
      localStorage.getItem(PREFS_KEY) ?? "{}"
    ) as Partial<ExportPrefs>;

    return {
      format: FORMATS.includes(raw.format as ExportFormat)
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
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    void 0;
  }
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
    name,
    width: frame.width,
    height: frame.height,
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
    id: frame.id,
    frame: toExport(frame, names[index]),
    active: frame.id === active.id,
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
