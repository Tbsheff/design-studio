import { routes } from "@design-studio/actions/workspace/routes";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { errorText } from "../../api.js";
import { call } from "../../platform/http.js";
import { reloadAppStageFrames } from "../../platform/stage-dom.js";
import { toHashOf, toReadyStatus } from "./code-edit-model.js";
import type { CodeEditStatus } from "./code-edit-model.js";
import { isApiConflict } from "./use-api-error.js";

interface CodeEdit {
  readonly generation: number;
  readonly initialText: string | null;
  readonly isPending: boolean;
  readonly status: CodeEditStatus;
  readonly handleChange: (text: string) => void;
  readonly handleReload: () => void;
  readonly handleSave: () => void;
}

const toSaveFailure = (
  isConflict: boolean,
  message: string,
  draft: { readonly hash: string; readonly text: string }
): CodeEditStatus => {
  if (isConflict) {
    return { ...draft, kind: "conflict" };
  }

  return { ...draft, kind: "failed", message };
};

interface SaveRequest {
  readonly baseHash: string;
  readonly content: string;
  readonly directionId: string;
  readonly path: string;
  readonly projectId: string;
}

const toSavedStatus = async (request: SaveRequest): Promise<CodeEditStatus> => {
  const { baseHash, content, directionId, path, projectId } = request;

  try {
    const saved = await call(routes.updateFileWorkspace, {
      baseHash,
      content,
      directionId,
      path,
      projectId,
    });

    return toReadyStatus({ hash: saved.hash, text: content }, true);
  } catch (error: unknown) {
    return toSaveFailure(isApiConflict(error), errorText(error), {
      hash: baseHash,
      text: content,
    });
  }
};

const useCodeEdit = (
  projectId: string,
  directionId: string,
  file: string
): CodeEdit => {
  const [status, setStatus] = useState<CodeEditStatus>({ kind: "loading" });
  const [initialText, setInitialText] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const [isPending, startSave] = useTransition();
  const draftRef = useRef<string | null>(null);
  const path = file;

  const load = useCallback((): void => {
    startTransition(async () => {
      try {
        const loaded = await call(routes.getFileWorkspace, {
          directionId,
          path,
          projectId,
        });

        draftRef.current = loaded.text;
        setInitialText(loaded.text);
        setStatus(toReadyStatus(loaded, false));
      } catch (error: unknown) {
        setStatus({ kind: "error", message: errorText(error) });
      }
    });
  }, [directionId, path, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = useCallback((text: string): void => {
    draftRef.current = text;
  }, []);

  const handleReload = useCallback((): void => {
    setStatus({ kind: "loading" });
    setInitialText(null);
    setGeneration((value) => value + 1);
    load();
  }, [load]);

  const handleSave = useCallback((): void => {
    const baseHash = toHashOf(status);
    const content = draftRef.current;

    if (baseHash === null || content === null) {
      return;
    }

    startSave(async () => {
      const saved = await toSavedStatus({
        baseHash,
        content,
        directionId,
        path,
        projectId,
      });

      setStatus(saved);

      if (saved.kind === "ready") {
        reloadAppStageFrames();
      }
    });
  }, [directionId, path, projectId, startSave, status]);

  return {
    generation,
    handleChange,
    handleReload,
    handleSave,
    initialText,
    isPending,
    status,
  };
};

export { useCodeEdit };

export type { CodeEdit };
