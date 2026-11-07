import type { PackSummary, ProjectKind } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import {
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { uiStore } from "../../platform/storage.js";
import { usePresence } from "../chat/use-presence.js";
import { type PacksState, pickable } from "../design-system/packs.js";
import { AppSlot, type AppSlotProps } from "./app-slot.js";
import { type Busy, LEVEL_LABEL, type Pop } from "./home-model.js";
import type { ModelSettings, PlusMenuActions } from "./home-popovers.js";
import {
  FolderPathPop,
  LevelPopover,
  ModelPopover,
  PackPopover,
  PlusMenu,
  loadPops,
} from "./lazy-parts.js";
import { PillSelect } from "./pill-select.js";
import { SendButton } from "./send-button.js";

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
    readonly folderPop: boolean;
    readonly onFolderPick: (path: string) => void;
    readonly onFolderClose: () => void;
  };
}

function ComposerBar({
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
}: ComposerBarProps) {
  const [pop, setPop] = useState<Pop>(null);
  const shownPop = usePresence(pop);
  const plusRef = useRef<HTMLButtonElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const levelRef = useRef<HTMLButtonElement>(null);
  const folderRef = useRef<HTMLButtonElement>(null);

  const closePop = useCallback(
    (refocus: boolean) => {
      const trigger = {
        plus: plusRef,
        pack: packRef,
        level: levelRef,
        model: modelRef,
        folder: folderRef,
      }[pop ?? "model"];

      setPop(null);

      if (refocus) {
        trigger.current?.focus();
      }
    },
    [pop]
  );

  const togglePop = (next: Exclude<Pop, null>) =>
    setPop((current) => (current === next ? null : next));

  useEffect(
    () =>
      setPop((current) =>
        app.folderPop ? "folder" : current === "folder" ? null : current
      ),
    [app.folderPop]
  );

  const closeFolder = (refocus: boolean) => {
    closePop(refocus);
    app.onFolderClose();
  };

  return (
    <div className="home-composer-bar">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <div className="home-anchor">
        <button
          ref={plusRef}
          type="button"
          className="icon-btn bordered home-square"
          aria-label="Add"
          aria-haspopup="menu"
          aria-expanded={pop === "plus"}
          data-tip="Attach, import and options"
          data-tip-align="start"
          onPointerEnter={() => void loadPops()}
          onClick={() => togglePop("plus")}
        >
          <Icon name="plus" size={16} />
        </button>
        {shownPop.shown === "plus" && (
          <Suspense fallback={null}>
            <PlusMenu
              trigger={plusRef}
              closing={shownPop.closing}
              onClose={closePop}
              locationLabel={locationLabel}
              actions={{ ...plusActions, onDesignSystem: () => setPop("pack") }}
            />
          </Suspense>
        )}
      </div>
      <div className="home-anchor">
        <AppSlot
          chip={app.chip}
          pop={pop}
          folderRef={folderRef}
          onAddFolder={app.onAddFolder}
          onDoctor={app.onDoctor}
        />
        {shownPop.shown === "folder" && (
          <Suspense fallback={null}>
            <FolderPathPop
              trigger={folderRef}
              closing={shownPop.closing}
              onClose={closeFolder}
              onPick={app.onFolderPick}
            />
          </Suspense>
        )}
      </div>
      {!app.chip && (
        <button
          type="button"
          className="icon-btn bordered home-square home-kind"
          aria-pressed={kind === "react"}
          aria-label="React + Vite project"
          data-tip={
            kind === "react"
              ? "React + Vite project. Press for a plain HTML page."
              : "Plain HTML page. Press for a React + Vite project."
          }
          onClick={() => onKind(kind === "react" ? "html" : "react")}
        >
          <Icon name="code" size={16} />
        </button>
      )}
      <div className="spacer" />
      <div className="home-anchor end">
        <PillSelect
          label="Design system"
          ariaLabel="Design system"
          value={pack?.name ?? "No design system"}
          open={pop === "pack"}
          triggerRef={packRef}
          onOpen={() => togglePop("pack")}
        />
        {shownPop.shown === "pack" && (
          <Suspense fallback={null}>
            <PackPopover
              trigger={packRef}
              closing={shownPop.closing}
              onClose={closePop}
              state={pickable(packs)}
              value={pack?.id ?? null}
              onChange={(id) => uiStore.set({ lastPackId: id })}
              onNew={() =>
                uiStore.set({ screen: "new-design-system", returnTo: "home" })
              }
            />
          </Suspense>
        )}
      </div>
      <div className="home-anchor end">
        <PillSelect
          label="Level"
          ariaLabel="Level"
          value={LEVEL_LABEL[modelSettings.level]}
          sizes={Object.values(LEVEL_LABEL)}
          open={pop === "level"}
          triggerRef={levelRef}
          onOpen={() => togglePop("level")}
        />
        {shownPop.shown === "level" && (
          <Suspense fallback={null}>
            <LevelPopover
              trigger={levelRef}
              closing={shownPop.closing}
              onClose={closePop}
              level={modelSettings.level}
              onLevel={modelSettings.onLevel}
            />
          </Suspense>
        )}
      </div>
      <div className="home-anchor end">
        <PillSelect
          label="Model"
          ariaLabel="Model and run settings"
          value={modelValue}
          sizes={modelSizes}
          open={pop === "model"}
          triggerRef={modelRef}
          onOpen={() => togglePop("model")}
        />
        {shownPop.shown === "model" && (
          <Suspense fallback={null}>
            <ModelPopover
              trigger={modelRef}
              closing={shownPop.closing}
              onClose={closePop}
              settings={modelSettings}
            />
          </Suspense>
        )}
      </div>
      <SendButton
        busy={busy}
        disabled={sendDisabled !== null}
        reason={sendDisabled}
        label={app.chip ? "Open" : "Create"}
      />
    </div>
  );
}

export { ComposerBar };

export type { ComposerBarProps };
