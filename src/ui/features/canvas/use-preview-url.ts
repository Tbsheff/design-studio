import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";

import type {
  ProjectKind,
  RenderCheckResult,
} from "../../../shared/contracts.js";
import { api, errorText } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { NO_VERSION_TEXT, RECT_REFRESH_MS } from "./canvas-helpers.js";
import type { CanvasSource } from "./canvas-toolbar.js";

function usePreviewUrl(
  projectId: string,
  directionId: string | null,
  source: CanvasSource,
  headVersionId: string | null
) {
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

    load
      .then(({ url }) => alive && setBaseUrl(url))
      .catch((err) => {
        if (!alive) {
          return;
        }

        setBaseUrl(null);
        const text = errorText(err);
        setUrlError(
          text === NO_VERSION_TEXT
            ? text
            : `Could not load the preview. ${text} Reload the page to try again.`
        );
      });

    return () => {
      alive = false;
    };
  }, [projectId, directionId, source.kind, versionId]);

  return { baseUrl, urlError };
}

function useRenderCheck(projectId: string, directionId: string | null) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<RenderCheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!directionId) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      setResults(await api.renderCheck(projectId, directionId));
    } catch (err) {
      setError(errorText(err));
      setResults(null);
    } finally {
      setChecking(false);
    }
  };

  const close = () => {
    setResults(null);
    setError(null);
  };

  return { checking, results, error, run, close };
}

function useFramePort(
  port: MutableRefObject<PreviewPort | null> | undefined,
  frames: PreviewPort | null,
  lastChange: FilesChange | null,
  kind: ProjectKind
) {
  useEffect(() => {
    if (!port) {
      return;
    }

    port.current = frames
      ? {
          post: frames.post,
          refreshRects: frames.refreshRects,
          listen: frames.listen,
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

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [lastChange, kind, port]);
}

export { useFramePort, usePreviewUrl, useRenderCheck };
