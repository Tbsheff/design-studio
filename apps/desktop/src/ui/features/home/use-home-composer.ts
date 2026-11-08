import type { RunLevel } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { useChipFlow } from "./use-chip-flow.js";
import type { ChipFlow } from "./use-chip-flow.js";
import { useComposerAttachments } from "./use-composer-attachments.js";
import type { ComposerAttachments } from "./use-composer-attachments.js";
import type { HomeBase } from "./use-home-base.js";
import { useRootDrop } from "./use-root-drop.js";
import type { RootDrop } from "./use-root-drop.js";
import { useRoutedFolderDrop } from "./use-routed-folder-drop.js";
import type { FolderSink } from "./use-routed-folder-drop.js";

interface HomeComposer {
  readonly attach: ComposerAttachments;
  readonly flow: ChipFlow;
  readonly root: RootDrop;
}

interface ComposerDeps {
  readonly base: HomeBase;
  readonly homeDir: string | null;
  readonly homeRef: RefObject<HTMLElement | null>;
  readonly composerRef: RefObject<HTMLElement | null>;
  readonly level: RunLevel;
  readonly onOpen: (projectId: string) => void;
}

const useHomeComposer = (deps: ComposerDeps): HomeComposer => {
  const { base, composerRef, homeDir, homeRef, level, onOpen } = deps;
  const { doctor, setBusy, setFormError } = base;

  const attached = useRef<{
    readonly contexts: ContextDraft[];
    readonly images: ImageDraft[];
    readonly references: ReferenceDraft[];
  }>({ contexts: [], images: [], references: [] });

  const flow = useChipFlow({
    attached,
    doctor,
    homeDir,
    level,
    onOpen,
    setBusy,
    setFormError,
  });

  const folderSink = useRef<FolderSink | null>(null);
  const takeDrop = useRoutedFolderDrop(flow, folderSink);
  const attach = useComposerAttachments(composerRef, setFormError, takeDrop);

  const { contexts, images, references } = attach;

  const { addContextFolder } = attach;

  useEffect(() => {
    attached.current = { contexts, images, references };
    folderSink.current = addContextFolder;
  }, [addContextFolder, contexts, images, references]);

  const root = useRootDrop(homeRef, takeDrop, setFormError);

  return { attach, flow, root };
};

export { useHomeComposer };

export type { ComposerDeps, HomeComposer };
