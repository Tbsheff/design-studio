import type { ProjectKind, RenderCheckResult } from "@design-studio/contracts";
import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";

import { api, errorText } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { NO_VERSION_TEXT, RECT_REFRESH_MS } from "./canvas-helpers.js";
import type { CanvasSource } from "./canvas-toolbar.js";

const usePreviewUrl = (
  projectId: string,
  directionId: string | null,
  source: CanvasSource,
  headVersionId: string | null
): { baseUrl: string | null; urlError: string | null } => {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const versionId: string | null = ((): string | null => {
    if (source.kind === "version") {
      return source.versionId;
    }

    if (source.kind === "last") {
      return headVersionId;
    }

    return null;
  })();

  useEffect(() => {
    let alive = true;
    setUrlError(null);

    if (!directionId) {
      return;
    }

    const load: Promise<{ url: string }> = ((): Promise<{ url: string }> => {
      if (source.kind === "live") {
        return api.directionPreview(projectId, directionId);
      }

      if (versionId) {
        return api.versionPreview(projectId, versionId);
      }

      return Promise.reject(new Error(NO_VERSION_TEXT));
    })();

    const fetchBase = async (): Promise<void> => {
      try {
        const { url } = await load;

        if (alive) {
          setBaseUrl(url);
        }
      } catch (error: unknown) {
        if (!alive) {
          return;
        }

        setBaseUrl(null);
        const text = errorText(error);

        let argument = `Could not load the preview. ${text} Reload the page to try again.`;

        if (text === NO_VERSION_TEXT) {
          argument = text;
        }

        setUrlError(argument);
      }
    };

    void fetchBase();

    return (): void => {
      alive = false;
    };
  }, [projectId, directionId, source.kind, versionId]);

  return { baseUrl, urlError };
};

const useRenderCheck = (
  projectId: string,
  directionId: string | null
): {
  checking: boolean;
  close: () => void;
  error: string | null;
  results: RenderCheckResult[] | null;
  run: () => Promise<void>;
} => {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<RenderCheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    if (!directionId) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      setResults(await api.renderCheck(projectId, directionId));
    } catch (caught) {
      setError(errorText(caught));
      setResults(null);
    } finally {
      setChecking(false);
    }
  };

  const close = (): void => {
    setResults(null);
    setError(null);
  };

  return { checking, close, error, results, run };
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

    port.current = null;

    if (frames) {
      port.current = {
        listen: frames.listen,
        post: frames.post,
        refreshRects: frames.refreshRects,
      };
    }
  });
  useEffect(() => {
    if (!lastChange || kind !== "react") {
      return;
    }

    const timers = RECT_REFRESH_MS.map((ms) =>
      globalThis.setTimeout(() => port?.current?.refreshRects(), ms)
    );

    return (): void =>
      timers.forEach((target) => globalThis.clearTimeout(target));
  }, [lastChange, kind, port]);
};

export { useFramePort, usePreviewUrl, useRenderCheck };
