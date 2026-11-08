import type { Project } from "@design-studio/contracts";
import { useCallback, useRef, useState, useTransition } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { api, errorText } from "../../api";
import { parseDraft, toDraft } from "../../features/chat";

type ShipSave = (() => Promise<void>) | null;

interface SettingsSaveInput {
  readonly onClose: () => void;
  readonly onSaved: (project: Project) => void;
  readonly project: Project;
}

interface SettingsSave {
  readonly draft: ReturnType<typeof toDraft>;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly save: () => void;
  readonly saveShip: MutableRefObject<ShipSave>;
  readonly setDraft: Dispatch<SetStateAction<ReturnType<typeof toDraft>>>;
}

const useSettingsSave = ({
  onClose,
  onSaved,
  project,
}: SettingsSaveInput): SettingsSave => {
  const [draft, setDraft] = useState(() => toDraft(project.settings));
  const [isSaving, startSave] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const saveShip = useRef<ShipSave>(null);

  const save = useCallback((): void => {
    const parsed = parseDraft(draft);

    if ("error" in parsed) {
      setFailure(parsed.error);

      return;
    }

    setFailure(null);
    startSave(async () => {
      try {
        await saveShip.current?.();
        onSaved(await api.updateSettings(project.id, parsed.settings));
        onClose();
      } catch (error) {
        setFailure(`Could not save settings. ${errorText(error)} Try again.`);
      }
    });
  }, [draft, onClose, onSaved, project.id]);

  const error = failure;

  return { draft, error, isSaving, save, saveShip, setDraft };
};

export { useSettingsSave };
