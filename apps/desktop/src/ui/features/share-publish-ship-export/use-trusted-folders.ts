import { useCallback, useState, useTransition } from "react";

import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import type { ConnectSetup } from "./connect-ai-api.js";
import { trustedCopy } from "./copy.js";
import { toAddedFolders, toRemovedFolders } from "./trusted-folders-model.js";

interface TrustedFoldersState {
  readonly draft: string;
  readonly handleAdd: () => void;
  readonly handleDraft: (draft: string) => void;
  readonly handlePick: () => void;
  readonly handleRemove: (folder: string) => void;
  readonly handleToggle: () => void;
  readonly hasPicker: boolean;
  readonly isOpen: boolean;
  readonly isPicking: boolean;
}

const useTrustedFolders = (
  setup: ConnectSetup,
  setTrustedFolders: (folders: readonly string[]) => void
): TrustedFoldersState => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPicking, startTransition] = useTransition();
  const saved = setup.trustedFolders;

  const handleDraft = useCallback((text: string): void => {
    setDraft(text);
  }, []);

  const handleToggle = useCallback((): void => {
    setIsOpen((previous) => !previous);
  }, []);

  const save = useCallback(
    (raw: string): void => {
      const next = toAddedFolders(saved, raw);

      if (next !== saved) {
        setTrustedFolders(next);
      }
    },
    [saved, setTrustedFolders]
  );

  const handleAdd = useCallback((): void => {
    save(draft);
    setDraft("");
  }, [draft, save]);

  const handlePick = useCallback((): void => {
    startTransition(async () => {
      const outcome = await pickFolder({ title: trustedCopy.pickTitle });

      if (outcome.kind === "picked") {
        save(outcome.path);
      }
    });
  }, [save]);

  const handleRemove = useCallback(
    (folder: string): void => {
      setTrustedFolders(toRemovedFolders(saved, folder));
    },
    [saved, setTrustedFolders]
  );

  const hasPicker = hasNativePicker();

  return {
    draft,
    handleAdd,
    handleDraft,
    handlePick,
    handleRemove,
    handleToggle,
    hasPicker,
    isOpen,
    isPicking,
  };
};

export { useTrustedFolders };

export type { TrustedFoldersState };
