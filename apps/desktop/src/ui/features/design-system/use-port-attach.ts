import { useCallback, useState, useTransition } from "react";

import type { FolderInspection } from "../../../shared/open-app.js";
import { api, errorText } from "../../api.js";
import { pickFolder } from "../../platform/desktop.js";
import { COPY } from "./copy.js";

type AttachResult = { projectId: string } | { inspection: FolderInspection };

const attachFolder = async (
  path: string,
  appDir: string | null
): Promise<AttachResult> => {
  const found = await api.inspectFolder(path, appDir ?? "");

  if (found.problem) {
    throw new Error(found.problem);
  }

  if (found.kind !== "next") {
    throw new Error(COPY.textMoveToAppNeedsNext);
  }

  if (!found.appDir && found.candidates.length > 1) {
    return { inspection: found };
  }

  const { project } = await api.attachApp({
    appDir: found.appDir ?? appDir ?? ".",
    folder: found.path,
  });

  return { projectId: project.id };
};

const toKnownAppDir = (
  found: FolderInspection | null,
  appDir: string
): string | null => {
  if (found && appDir) {
    return appDir;
  }

  return null;
};

interface Attach {
  appDir: string;
  choose: () => Promise<void>;
  edit: (next: string) => void;
  failure: string | null;
  found: FolderInspection | null;
  isBusy: boolean;
  path: string;
  run: (folder: string) => void;
  setAppDir: (next: string) => void;
}

const useAttach = (onAttached: (projectId: string) => void): Attach => {
  const [path, setPath] = useState("");
  const [isBusy, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [found, setFound] = useState<FolderInspection | null>(null);
  const [appDir, setAppDir] = useState("");

  const run = useCallback(
    (folder: string): void => {
      if (!folder.trim() || isBusy) {
        return;
      }

      setFailure(null);
      startTransition(async () => {
        try {
          const result = await attachFolder(
            folder.trim(),
            toKnownAppDir(found, appDir)
          );

          if ("projectId" in result) {
            onAttached(result.projectId);
          } else {
            setFound(result.inspection);
          }
        } catch (error: unknown) {
          setFailure(errorText(error));
        }
      });
    },
    [appDir, found, isBusy, onAttached]
  );

  const choose = useCallback(async (): Promise<void> => {
    const picked = await pickFolder({ title: COPY.titleChooseAppFolder });

    if (picked.kind !== "picked") {
      return;
    }

    setPath(picked.path);
    setFound(null);
    run(picked.path);
  }, [run]);

  const edit = useCallback((next: string): void => {
    setPath(next);
    setFound(null);
  }, []);

  return { appDir, choose, edit, failure, found, isBusy, path, run, setAppDir };
};

export { useAttach };

export type { Attach };
