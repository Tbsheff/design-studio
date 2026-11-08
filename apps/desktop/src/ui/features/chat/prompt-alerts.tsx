import { useCallback } from "react";
import type { ReactElement } from "react";

import { FileAlert } from "./file-alert.js";
import type { AlertComponent } from "./file-alert.js";
import type { PromptBase } from "./use-prompt-base.js";

const PromptAlerts = ({
  base,
  Alert,
}: {
  base: PromptBase;
  Alert: AlertComponent;
}): ReactElement => {
  const { error, files, removeFile, runLevel, setError } = base;
  const { clearError: clearLevelError } = runLevel;
  const clearError = useCallback(() => setError(null), [setError]);

  return (
    <>
      {files.map((file) => (
        <FileAlert
          key={file.localId}
          file={file}
          Alert={Alert}
          onRemove={removeFile}
        />
      ))}
      {error && <Alert onClose={clearError}>{error}</Alert>}
      {runLevel.error && (
        <Alert onClose={clearLevelError}>{runLevel.error}</Alert>
      )}
    </>
  );
};

export { PromptAlerts };
