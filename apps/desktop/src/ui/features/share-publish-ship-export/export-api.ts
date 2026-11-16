import { routes as canvasRoutes } from "@design-studio/actions/canvas/routes";
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
import type { RouteOutput } from "../../platform/http.js";
import { isFieldSource } from "../../platform/json-guard.js";
import { readStored, uiStore, writeStored } from "../../platform/storage.js";
import { canvasStore } from "../canvas/canvas-frames-model.js";
import type { CanvasFrame } from "../canvas/canvas-frames-model.js";
import { activeFrame, defaultLayout, frameName } from "../canvas/index.js";
import { pick } from "./pick.js";

interface PathFields {
  path?: string;
}

interface EditorBody {
  editor: EditorId;
  file?: string;
}

const toPathFields = (path: string | undefined): PathFields => {
  if (path) {
    return { path };
  }

  return {};
};

const toEditorBody = (
  editor: EditorId,
  file: string | undefined
): EditorBody => {
  if (file) {
    return { editor, file };
  }

  return { editor };
};

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

interface FlowRequest {
  readonly directionId: string | null;
  readonly format: "gif" | "mp4" | "webm";
  readonly maxSteps: number;
  readonly stepMs: number;
}

const FLOW_WIDTH = 1440;

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
      ...toPathFields(request.frame.path),
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
  exportFlow: (
    pid: string,
    request: FlowRequest
  ): Promise<RouteOutput<typeof canvasRoutes.exportFlowCanvas>> =>
    callAction(canvasRoutes.exportFlowCanvas, {
      directionId: request.directionId,
      format: request.format,
      linkIds: null,
      maxSteps: request.maxSteps,
      projectId: pid,
      startFrameId: null,
      stepMs: request.stepMs,
      width: FLOW_WIDTH,
    }),
  getFlowVideo: async (pid: string, file: string): Promise<ExportedFile> => {
    const video = await callAction(canvasRoutes.getFlowVideoCanvas, {
      file,
      projectId: pid,
    });

    return toExportedFile({ ...video, note: null });
  },
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
      toEditorBody(editor, file)
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

const FORMAT_LIST: readonly ExportFormat[] = [
  "png",
  "pdf",
  "html",
  "zip",
  "handoff",
  "svg",
  "pptx",
];

const SCALE_THREE = 3;
const SCALE_LIST: readonly ExportScale[] = [1, 2, SCALE_THREE];

const toPrefs = (raw: ReadonlyMap<string, unknown>): ExportPrefs => {
  const format = raw.get("format");
  const scale = raw.get("scale");

  return {
    format:
      FORMAT_LIST.find((candidate) => candidate === format) ??
      DEFAULT_PREFS.format,
    scale:
      SCALE_LIST.find((candidate) => candidate === scale) ??
      DEFAULT_PREFS.scale,
    scope: pick(raw.get("scope") === "frame", "frame", "page"),
  };
};

const readExportPrefs = (): ExportPrefs => {
  try {
    const parsed: unknown = JSON.parse(readStored(PREFS_KEY) ?? "{}");

    if (isFieldSource(parsed)) {
      return toPrefs(new Map(Object.entries(parsed)));
    }

    return DEFAULT_PREFS;
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
  ...toPathFields(frame.path),
});

const frameRoute = (frame: ExportFrame): string =>
  `/${(frame.path ?? "").replace(/^\/+/u, "")}`;

const choiceNames = (frames: CanvasFrame[]): string[] => {
  const names = frames.map((frame) => toExport(frame).name);

  return names.map((name, index) =>
    pick(
      names.filter((other) => other === name).length < 2,
      name,
      `Frame ${index + 1}`
    )
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

  let list = [active];

  if (own.length > 0) {
    list = own;
  }

  const names = choiceNames(list);

  return list.map((frame, index) => ({
    active: frame.id === active.id,
    frame: toExport(frame, names[index]),
    id: frame.id,
  }));
};

const activeExportFrame = (projectId: string): ExportFrame => {
  const layout =
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);

  return toExport(activeFrame(layout));
};

interface ExportTarget {
  projectId: string;
  directionId: string | null;
  versionId: string;
  versionLabel: string | null;
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
  Boolean(desktopBridge<RevealBridge>()?.revealExport);

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
  FlowRequest,
  ExportPrefs,
  FrameChoice,
  ExportTarget,
  OpenExportDetail,
};
