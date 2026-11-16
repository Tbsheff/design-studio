import { useModalDialog } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { AppSettingsBody } from "./app-settings-body";
import { AppSettingsFoot } from "./app-settings-foot";
import { AppSettingsHead } from "./app-settings-head";
import { copy } from "./copy";
import { useBackdropDismiss } from "./use-backdrop-dismiss";

const PROJECT_SETTINGS_COMMAND = "project.settings";

interface AppSettingsDialogProps {
  readonly hasProject: boolean;
  readonly onClose: () => void;
  readonly onConnectAi: () => void;
}

const openProjectSettings = (): void => {
  globalThis.dispatchEvent(
    new CustomEvent("studio:command", { detail: PROJECT_SETTINGS_COMMAND })
  );
};

const AppSettingsDialog = ({
  hasProject,
  onClose,
  onConnectAi,
}: AppSettingsDialogProps): ReactElement => {
  const { ref } = useModalDialog(onClose);

  useBackdropDismiss(ref, onClose);

  const showProject = useCallback((): void => {
    onClose();
    openProjectSettings();
  }, [onClose]);

  const showConnectAi = useCallback((): void => {
    onClose();
    onConnectAi();
  }, [onClose, onConnectAi]);

  return (
    <dialog
      ref={ref}
      className="modal settings-modal"
      aria-label={copy.settings}
    >
      <AppSettingsHead onClose={onClose} />
      <AppSettingsBody onConnectAi={showConnectAi} />
      <AppSettingsFoot
        hasProject={hasProject}
        onClose={onClose}
        onProject={showProject}
      />
    </dialog>
  );
};

export { AppSettingsDialog };
