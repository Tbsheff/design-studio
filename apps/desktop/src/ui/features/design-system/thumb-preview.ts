import { componentPreviewPath } from "../../../shared/component-preview.js";
import { getRaw } from "../../platform/http.js";
import { trimmedOrSelf } from "./thumb-trim.js";

type Shown =
  | { state: "idle" | "loading" }
  | { state: "ready"; blob: Blob }
  | { state: "none"; reason: string };

interface PreviewLoad {
  readonly controller: AbortController;
  readonly directionId: string;
  readonly id: string;
  readonly projectId: string;
  readonly setShown: (update: (prev: Shown) => Shown) => void;
  readonly version: string;
}

const NO_PREVIEW = "No preview for this component.";

const readMessage = async (res: Response): Promise<string> => {
  try {
    const body: { message?: string } | null = await res.json();
    const message = body?.message ?? null;

    if (message === String(message)) {
      return String(message);
    }
  } catch {
    return NO_PREVIEW;
  }

  return NO_PREVIEW;
};

type PreviewBlob =
  | { blob: Blob; kind: "blob" }
  | { kind: "none"; reason: string };

const loadPreviewBlob = async (load: PreviewLoad): Promise<PreviewBlob> => {
  const res = await getRaw(
    `${componentPreviewPath(load.projectId, load.directionId, load.id)}&v=${encodeURIComponent(load.version)}`,
    load.controller.signal
  );

  if (res.ok) {
    return { blob: await trimmedOrSelf(await res.blob()), kind: "blob" };
  }

  return { kind: "none", reason: await readMessage(res) };
};

const keepReady = (prev: Shown, next: Shown): Shown => {
  if (next.state === "none" && prev.state === "ready") {
    return prev;
  }

  return next;
};

export { keepReady, loadPreviewBlob };

export type { PreviewBlob, PreviewLoad, Shown };
