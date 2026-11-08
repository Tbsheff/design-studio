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
) => {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const versionId =
    source.kind === "version"
      ? source.versionId
      : source.kind === "last"
        ? headVersionId
        : null;

  useEffect(() => {
    let alive = true;
    setUrlError(null);

    if (!directionId) {
      return;
    }

    const load =
      source.kind === "live"
        ? api.directionPreview(projectId, directionId)
        : versionId
          ? api.versionPreview(projectId, versionId)
          : Promise.reject(new Error(NO_VERSION_TEXT));

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
        setUrlError(
          text === NO_VERSION_TEXT
            ? text
            : `Could not load the preview. ${text} Reload the page to try again.`
        );
      }
    };
    void fetchBase();

    return (): void => {
      alive = false;
    };
  }, [projectId, directionId, source.kind, versionId]);

  return { baseUrl, urlError };
};

const useRenderCheck = (projectId: string, directionId: string | null) => {
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
    } catch (failure) {
      setError(errorText(failure));
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

    port.current = frames
      ? {
          listen: frames.listen,
          post: frames.post,
          refreshRects: frames.refreshRects,
        }
      : null;
  });
  useEffect(() => {
    if (!lastChange || kind !== "react") {
      return;
    }

    const timers = RECT_REFRESH_MS.map((ms) =>
      window.setTimeout(() => port?.current?.refreshRects(), ms)
    );

    return (): void => timers.forEach((t) => window.clearTimeout(t));
  }, [lastChange, kind, port]);
};

export { useFramePort, usePreviewUrl, useRenderCheck };
