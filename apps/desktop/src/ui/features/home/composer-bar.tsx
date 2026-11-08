import type { PackSummary, ProjectKind } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { usePresence } from "../chat/use-presence.js";
import { pickable } from "../design-system/packs.js";
import type { PacksState } from "../design-system/packs.js";
import type { AppSlotProps } from "./app-slot-model.js";
import { ComposerContextInput } from "./composer-context-input.js";
import { ComposerFileInput } from "./composer-file-input.js";
import { toSendLabel } from "./composer-pop-model.js";
import { FolderAnchor } from "./folder-anchor.js";
import type { Busy } from "./home-model.js";
import { KindToggle } from "./kind-toggle.js";
import { ModelAnchors } from "./model-anchors.js";
import type { ModelSettings } from "./model-settings-model.js";
import { PackAnchor } from "./pack-anchor.js";
import { PlusAnchor } from "./plus-anchor.js";
import type { PlusMenuActions } from "./plus-menu-model.js";
import { SendButton } from "./send-button.js";
import { useComposerPops } from "./use-composer-pops.js";
import { useFolderPopState } from "./use-folder-pop-state.js";

interface ComposerBarProps {
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly contextFileRef: RefObject<HTMLInputElement | null>;
  readonly onContextFiles: (files: File[]) => void;
  readonly onFiles: (files: File[]) => void;
  readonly plusActions: Omit<PlusMenuActions, "onDesignSystem">;
  readonly locationLabel: string;
  readonly packs: PacksState;
  readonly pack: PackSummary | null;
  readonly kind: ProjectKind;
  readonly onKind: (kind: ProjectKind) => void;
  readonly modelValue: string;
  readonly modelSizes: string[];
  readonly modelSettings: ModelSettings;
  readonly busy: Busy;
  readonly sendDisabled: string | null;
  readonly app: Omit<AppSlotProps, "pop" | "folderRef"> & {
    readonly isFolderPopOpen: boolean;
    readonly onFolderPick: (path: string) => void;
    readonly onFolderClose: () => void;
  };
}

const ComposerBar = ({
  fileRef,
  contextFileRef,
  onContextFiles,
  onFiles,
  plusActions,
  locationLabel,
  packs,
  pack,
  kind,
  onKind,
  modelValue,
  modelSizes,
  modelSettings,
  busy,
  sendDisabled,
  app,
}: ComposerBarProps): ReactElement => {
  const [pop, setPop] = useFolderPopState(app.isFolderPopOpen);
  const presence = usePresence(pop);
  const { closing: isClosing, shown } = presence;
  const { onAddFolder, onDoctor, onFolderPick, onFolderClose } = app;

  const pops = useComposerPops({
    isClosing,
    onFolderClose,
    pop,
    setPop,
    shown,
  });

  const { closeFolder: handleFolderClose, openPack: onDesignSystem } = pops;

  return (
    <div className="home-composer-bar">
      <ComposerFileInput fileRef={fileRef} onFiles={onFiles} />
      <ComposerContextInput fileRef={contextFileRef} onFiles={onContextFiles} />
      <PlusAnchor
        pops={pops.state}
        triggerRef={pops.refs.plus}
        locationLabel={locationLabel}
        plusActions={plusActions}
        onDesignSystem={onDesignSystem}
      />
      <FolderAnchor
        pops={pops.state}
        chip={app.chip}
        triggerRef={pops.refs.folder}
        onAddFolder={onAddFolder}
        onDoctor={onDoctor}
        onFolderPick={onFolderPick}
        onFolderClose={handleFolderClose}
      />
      {!app.chip && <KindToggle kind={kind} onKind={onKind} />}
      <div className="spacer" />
      <PackAnchor
        pops={pops.state}
        triggerRef={pops.refs.pack}
        pack={pack}
        state={pickable(packs)}
      />
      <ModelAnchors
        pops={pops.state}
        levelRef={pops.refs.level}
        modelRef={pops.refs.model}
        modelValue={modelValue}
        modelSizes={modelSizes}
        modelSettings={modelSettings}
      />
      <SendButton
        busy={busy}
        isDisabled={sendDisabled !== null}
        reason={sendDisabled}
        label={toSendLabel(app.chip !== null)}
      />
    </div>
  );
};

export { ComposerBar };

export type { ComposerBarProps };
