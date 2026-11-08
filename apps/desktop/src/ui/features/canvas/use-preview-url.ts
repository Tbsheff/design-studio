import type { ProjectKind, RenderCheckResult } from "@design-studio/contracts";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { MutableRefObject } from "react";

import { api, errorText } from "../../api.js";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { NO_VERSION_TEXT, RECT_REFRESH_MS } from "./canvas-helpers.js";

interface PreviewUrlState {
  readonly requestKey: string;
  readonly url: string | null;
  readonly error: string | null;
}

interface PreviewUrl {
  readonly baseUrl: string | null;
  readonly urlError: string | null;
}

interface RenderCheckOutcome {
  readonly error: string | null;
  readonly results: RenderCheckResult[] | null;
}

interface RenderCheckState {
  readonly checking: boolean;
  readonly close: () => void;
  readonly error: string | null;
  readonly results: RenderCheckResult[] | null;
  readonly run: () => void;
}

const INITIAL_PREVIEW_URL: PreviewUrlState = {
  error: null,
  requestKey: "",
  url: null,
};

const toVersionId = (
  source: CanvasSource,
  headVersionId: string | null
): string | null => {
  if (source.kind === "version") {
    return source.versionId;
  }

  if (source.kind === "last") {
    return headVersionId;
  }

  return null;
};

const toPreviewRequest = (
  projectId: string,
  directionId: string,
  source: CanvasSource,
  versionId: string | null
): Promise<{ url: string }> => {
  if (source.kind === "live") {
    return api.directionPreview(projectId, directionId);
  }

  if (versionId) {
    return api.versionPreview(projectId, versionId);
  }

  return Promise.reject(new Error(NO_VERSION_TEXT));
};

const toUrlError = (text: string): string => {
  if (text === NO_VERSION_TEXT) {
    return text;
  }

  return `Could not load the preview. ${text} Reload the page to try again.`;
};

const usePreviewUrl = (
  projectId: string,
  directionId: string | null,
  source: CanvasSource,
  headVersionId: string | null
): PreviewUrl => {
  const [state, setState] = useState(INITIAL_PREVIEW_URL);
  const versionId = toVersionId(source, headVersionId);
  const key = `${projectId}|${directionId}|${source.kind}|${versionId}`;

  useEffect(() => {
    if (!directionId) {
      return;
    }

    let alive = true;

    const fetchBase = async (): Promise<void> => {
      try {
        const { url } = await toPreviewRequest(
          projectId,
          directionId,
          source,
          versionId
        );

        if (alive) {
          setState({ error: null, requestKey: key, url });
        }
      } catch (error: unknown) {
        if (alive) {
          const message = toUrlError(errorText(error));
          setState({ error: message, requestKey: key, url: null });
        }
      }
    };

    void fetchBase();

    return (): void => {
      alive = false;
    };
  }, [projectId, directionId, source, versionId, key]);

  if (state.requestKey === key) {
    return { baseUrl: state.url, urlError: state.error };
  }

  return { baseUrl: state.url, urlError: null };
};

const toRenderCheckOutcome = async (
  projectId: string,
  directionId: string
): Promise<RenderCheckOutcome> => {
  try {
    return {
      error: null,
      results: await api.renderCheck(projectId, directionId),
    };
  } catch (error: unknown) {
    return { error: errorText(error), results: null };
  }
};

const useRenderCheck = (
  projectId: string,
  directionId: string | null
): RenderCheckState => {
  const [checking, startCheck] = useTransition();
  const [results, setResults] = useState<RenderCheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((): void => {
    if (!directionId) {
      return;
    }

    setError(null);

    startCheck(async () => {
      const outcome = await toRenderCheckOutcome(projectId, directionId);
      setResults(outcome.results);
      setError(outcome.error);
    });
  }, [projectId, directionId]);

  const close = useCallback((): void => {
    setResults(null);
    setError(null);
  }, []);

  return { checking, close, error, results, run };
};

const assignPort = (
  port: MutableRefObject<PreviewPort | null>,
  frames: PreviewPort | null
): void => {
  port.current = null;

  if (frames) {
    port.current = {
      listen: frames.listen,
      post: frames.post,
      refreshRects: frames.refreshRects,
    };
  }
};

const useFramePort = (
  port: MutableRefObject<PreviewPort | null> | undefined,
  frames: PreviewPort | null,
  lastChange: FilesChange | null,
  kind: ProjectKind
): void => {
  useEffect(() => {
    if (!port) {
      return;
    }

    assignPort(port, frames);
  });
  useEffect(() => {
    if (!lastChange || kind !== "react") {
      return;
    }

    const timers = RECT_REFRESH_MS.map((ms) =>
      globalThis.setTimeout(() => port?.current?.refreshRects(), ms)
    );

    return (): void => {
      for (const target of timers) {
        globalThis.clearTimeout(target);
      }
    };
  }, [lastChange, kind, port]);
};

export { useFramePort, usePreviewUrl, useRenderCheck };

export type { RenderCheckState };
