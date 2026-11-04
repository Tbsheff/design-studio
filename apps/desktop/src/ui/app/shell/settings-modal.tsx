import { Suspense, useRef, useState, useTransition } from "react";

import type { Project } from "@design-studio/actions/_core/contracts";
import { api, errorText } from "../../api";
import { CommandRules } from "../../features/commands/command-rules";
import { KeysPanel } from "../../features/settings";
import { PublishSetup } from "../../features/share-publish-ship-export/index.js";
import { ShipTemplates } from "../../features/share-publish-ship-export/ship-templates";
import { Icon } from "../../kit/Icon";
import { useModalDialog } from "../../kit/use-popover";
import { parseDraft, SettingsFields, toDraft } from "./settings-fields";

interface Props {
  project: Project;
  onSaved: (project: Project) => void;
  onClose: () => void;
}

export function SettingsModal({ project, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState(() => toDraft(project.settings));
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const saveShip = useRef<(() => Promise<void>) | null>(null);

  const dialog = useModalDialog(onClose);

  const save = () => {
    const parsed = parseDraft(draft);

    if ("error" in parsed) {
      setError(parsed.error);

      return;
    }

    setError(null);
    startSave(async () => {
      try {
        await saveShip.current?.();
        onSaved(await api.updateSettings(project.id, parsed.settings));
        onClose();
      } catch (caught) {
        setError(`Could not save settings. ${errorText(caught)} Try again.`);
      }
    });
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal settings-modal"
      aria-label="Project settings"
      onMouseDown={dialog.onMouseDown}
    >
      <div className="modal-head">
        <div className="titles">
          <h2>Project settings</h2>
          <p>Applies to the next run.</p>
        </div>
        <button
          className="icon-btn"
          aria-label="Close settings"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">
        <SettingsFields
          draft={draft}
          onChange={setDraft}
          shellExtra={<CommandRules projectId={project.id} />}
        />
        {project.app && (
          <ShipTemplates projectId={project.id} saveRef={saveShip} />
        )}
        <Suspense fallback={null}>
          <PublishSetup />
          <KeysPanel />
        </Suspense>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </dialog>
  );
}
