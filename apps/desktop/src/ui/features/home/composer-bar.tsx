import type { PackSummary, ProjectKind } from "@design-studio/contracts";
import { useEffect, useState } from "react";
import type { ReactElement, RefObject } from "react";

import { usePresence } from "../chat/use-presence.js";
import { pickable } from "../design-system/packs.js";
import type { PacksState } from "../design-system/packs.js";
import type { AppSlotProps } from "./app-slot-model.js";
import { ComposerFileInput } from "./composer-file-input.js";
import { toNextFolderPop, toSendLabel } from "./composer-pop-model.js";
import { FolderAnchor } from "./folder-anchor.js";
import type { Busy, Pop } from "./home-model.js";
import { KindToggle } from "./kind-toggle.js";
import { LevelAnchor } from "./level-anchor.js";
import { ModelAnchor } from "./model-anchor.js";
import type { ModelSettings } from "./model-settings-model.js";
import { PackAnchor } from "./pack-anchor.js";
import { PlusAnchor } from "./plus-anchor.js";
import type { PlusMenuActions } from "./plus-menu-model.js";
import { SendButton } from "./send-button.js";
import { useComposerPops } from "./use-composer-pops.js";

interface ComposerBarProps {
  readonly fileRef: RefObject<HTMLInputElement | null>;
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
  const [pop, setPop] = useState<Pop>(null);
  const presence = usePresence(pop);

  const pops = useComposerPops({
    isClosing: presence.closing,
    onFolderClose: app.onFolderClose,
    pop,
    setPop,
    shown: presence.shown,
  });

  const { isFolderPopOpen } = app;

  useEffect(() => {
    setPop((current) => toNextFolderPop(current, isFolderPopOpen));
  }, [isFolderPopOpen]);

  return (
    <div className="home-composer-bar">
      <ComposerFileInput fileRef={fileRef} onFiles={onFiles} />
      <PlusAnchor
        pops={pops.state}
        triggerRef={pops.refs.plus}
        locationLabel={locationLabel}
        plusActions={plusActions}
        onDesignSystem={pops.openPack}
      />
      <FolderAnchor
        pops={pops.state}
        chip={app.chip}
        triggerRef={pops.refs.folder}
        onAddFolder={app.onAddFolder}
        onDoctor={app.onDoctor}
        onFolderPick={app.onFolderPick}
        onFolderClose={pops.closeFolder}
      />
      {!app.chip && <KindToggle kind={kind} onKind={onKind} />}
      <div className="spacer" />
      <PackAnchor
        pops={pops.state}
        triggerRef={pops.refs.pack}
        pack={pack}
        state={pickable(packs)}
      />
      <LevelAnchor
        pops={pops.state}
        triggerRef={pops.refs.level}
        modelSettings={modelSettings}
      />
      <ModelAnchor
        pops={pops.state}
        triggerRef={pops.refs.model}
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
