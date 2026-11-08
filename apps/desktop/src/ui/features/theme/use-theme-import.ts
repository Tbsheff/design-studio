import { useCallback, useState, useTransition } from "react";

import { api, errorText, themeRoutes, useAction } from "./deps.js";
import { toImportName } from "./theme-model.js";

interface ThemeImportSetup {
  readonly directionId: string;
  readonly projectId: string;
}

interface ThemeImport {
  readonly error: string | null;
  readonly handleImage: (file: File) => void;
  readonly handleUrl: (url: string) => void;
  readonly isBusy: boolean;
}

const useThemeImport = (setup: ThemeImportSetup): ThemeImport => {
  const { directionId: directionKey, projectId: projectKey } = setup;
  const importer = useAction(themeRoutes.importTheme);
  const [isWorking, startWork] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { run: runImport } = importer;

  const handleUrl = useCallback(
    (url: string): void => {
      const trimmed = url.trim();

      if (trimmed === "") {
        return;
      }

      setUploadError(null);

      startWork(async () => {
        await runImport({
          directionId: directionKey,
          imagePath: null,
          name: null,
          projectId: projectKey,
          url: trimmed,
        });
      });
    },
    [directionKey, projectKey, runImport]
  );

  const handleImage = useCallback(
    (file: File): void => {
      setUploadError(null);

      startWork(async () => {
        try {
          const saved = await api.uploadAttachment(projectKey, file);

          await runImport({
            directionId: directionKey,
            imagePath: saved.path,
            name: toImportName(file.name),
            projectId: projectKey,
            url: null,
          });
        } catch (error) {
          setUploadError(errorText(error));
        }
      });
    },
    [directionKey, projectKey, runImport]
  );

  const error = uploadError ?? importer.error?.message ?? null;

  return { error, handleImage, handleUrl, isBusy: isWorking };
};

export { useThemeImport };

export type { ThemeImport, ThemeImportSetup };
