import type { RunLevel } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import { useChipFlow } from "./use-chip-flow.js";
import type { ChipFlow } from "./use-chip-flow.js";
import { useComposerAttachments } from "./use-composer-attachments.js";
import type { ComposerAttachments } from "./use-composer-attachments.js";
import type { HomeBase } from "./use-home-base.js";
import { useRootDrop } from "./use-root-drop.js";
import type { RootDrop } from "./use-root-drop.js";

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
    readonly images: ImageDraft[];
    readonly references: ReferenceDraft[];
  }>({ images: [], references: [] });

  const flow = useChipFlow({
    attached,
    doctor,
    homeDir,
    level,
    onOpen,
    setBusy,
    setFormError,
  });

  const attach = useComposerAttachments(
    composerRef,
    setFormError,
    flow.takeDrop
  );

  const { images, references } = attach;

  useEffect(() => {
    attached.current = { images, references };
  }, [images, references]);

  const root = useRootDrop(homeRef, flow.takeDrop, setFormError);

  return { attach, flow, root };
};

export { useHomeComposer };

export type { ComposerDeps, HomeComposer };
