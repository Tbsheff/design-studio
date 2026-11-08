import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { Busy } from "./home-model.js";
import { useDoctorGate } from "./use-doctor-gate.js";
import type { DoctorGateController } from "./use-doctor-gate.js";
import { useFolderChooser } from "./use-folder-chooser.js";
import type { FolderChooser } from "./use-folder-chooser.js";

interface HomeBase {
  readonly busy: Busy;
  readonly chooser: FolderChooser;
  readonly doctor: DoctorGateController;
  readonly formError: string | null;
  readonly isTrashOpen: boolean;
  readonly setBusy: Dispatch<SetStateAction<Busy>>;
  readonly setFormError: Dispatch<SetStateAction<string | null>>;
  readonly setIsTrashOpen: Dispatch<SetStateAction<boolean>>;
}

const useHomeBase = (): HomeBase => {
  const [busy, setBusy] = useState<Busy>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const chooser = useFolderChooser(setFormError);
  const doctor = useDoctorGate();

  return {
    busy,
    chooser,
    doctor,
    formError,
    isTrashOpen,
    setBusy,
    setFormError,
    setIsTrashOpen,
  };
};

export { useHomeBase };

export type { HomeBase };
