import type { Project } from "@design-studio/contracts";
import { useModalDialog } from "@design-studio/ui";
import type { ReactElement } from "react";

import { ShipTemplates } from "../../features/share-publish-ship-export/ship-templates";
import { SettingsModalBody } from "./settings-modal-body";
import { SettingsModalFoot } from "./settings-modal-foot";
import { SettingsModalHead } from "./settings-modal-head";
import { SettingsPanels } from "./settings-panels";
import { SettingsRulesFields } from "./settings-rules-fields";
import { useBackdropDismiss } from "./use-backdrop-dismiss";
import { useSettingsSave } from "./use-settings-save";

interface SettingsModalProps {
  project: Project;
  onSaved: (project: Project) => void;
  onClose: () => void;
}

const SettingsModal = ({
  project,
  onSaved,
  onClose,
}: SettingsModalProps): ReactElement => {
  const { draft, error, isSaving, save, saveShip, setDraft } = useSettingsSave({
    onClose,
    onSaved,
    project,
  });

  const { ref } = useModalDialog(onClose);

  useBackdropDismiss(ref, onClose);

  const ships = project.app && (
    <ShipTemplates projectId={project.id} saveRef={saveShip} />
  );

  return (
    <dialog
      ref={ref}
      className="modal settings-modal"
      aria-label="Project settings"
    >
      <SettingsModalHead onClose={onClose} />
      <SettingsModalBody error={error}>
        <SettingsRulesFields
          draft={draft}
          onChange={setDraft}
          projectId={project.id}
        />
        {ships}
        <SettingsPanels />
      </SettingsModalBody>
      <SettingsModalFoot isSaving={isSaving} onClose={onClose} onSave={save} />
    </dialog>
  );
};

export { SettingsModal };
