import type { ReactElement } from "react";

import { ChipMenuSlot } from "./chip-menu-slot.js";
import { ComposerBar } from "./composer-bar.js";
import { ComposerChips } from "./composer-chips.js";
import { ComposerUrlForms } from "./composer-url-forms.js";
import { DropHint } from "./drop-hint.js";
import { ExpandPromptSlot } from "./expand-prompt-slot.js";
import { HomePrompt } from "./home-prompt.js";
import { StarterRow } from "./starter-row.js";
import { useComposerHandlers } from "./use-composer-handlers.js";
import type { HomeScreen } from "./use-home-screen.js";

const toComposerClass = (isDragging: boolean): string => {
  if (isDragging) {
    return "ui-composer home-composer dragging";
  }

  return "ui-composer home-composer";
};

const HomeComposer = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement => {
  const { base, composer, draft, lib, refs, submit, ui } = screen;
  const { attach, flow } = composer;
  const { chip, clear, update } = flow.app;
  const { composerRef, chipTriggerRef } = refs;
  const { create } = submit;
  const handlers = useComposerHandlers(flow, draft.prompt);
  const { barApp, closeMenu, openTokensOnly, toggleMenu } = handlers;
  const { openProject, openStarter } = lib.openFlows;
  const { addContextFiles, addImages, removeContext } = attach;
  const { removeImage, removeReference } = attach;
  const { changeKind } = draft;

  return (
    <form
      ref={composerRef}
      className={toComposerClass(attach.isDragging)}
      onSubmit={create}
    >
      <ComposerChips
        chip={chip}
        isChipMenuOpen={flow.isAppMenuOpen}
        chipTriggerRef={chipTriggerRef}
        onChipMenu={toggleMenu}
        onChipRemove={clear}
        contexts={attach.contexts}
        images={attach.images}
        references={attach.references}
        onRemoveContext={removeContext}
        onRemoveImage={removeImage}
        onRemoveReference={removeReference}
      />
      <ComposerUrlForms attach={attach} onOpen={openProject} />
      <ChipMenuSlot
        isShown={ui.isMenuShown}
        isClosing={ui.isMenuClosing}
        chip={chip}
        homeDir={lib.homeDir}
        triggerRef={chipTriggerRef}
        onClose={closeMenu}
        onChange={update}
        onTokensOnly={openTokensOnly}
      />
      <HomePrompt screen={screen} />
      <DropHint isOn={attach.isDragging} />
      <StarterRow
        template={draft.template}
        busy={base.busy}
        onOpen={openStarter}
      />
      <ComposerBar
        fileRef={attach.fileRef}
        contextFileRef={attach.contextFileRef}
        onFiles={addImages}
        onContextFiles={addContextFiles}
        plusActions={ui.plusActions}
        packs={lib.packs}
        pack={lib.pack}
        kind={draft.kind}
        onKind={changeKind}
        modelValue={draft.modelValue}
        modelSizes={draft.modelSizes}
        modelSettings={ui.modelSettings}
        busy={base.busy}
        sendDisabled={ui.sendBlocker}
        app={barApp}
      >
        <ExpandPromptSlot draft={draft} />
      </ComposerBar>
    </form>
  );
};

export { HomeComposer };
