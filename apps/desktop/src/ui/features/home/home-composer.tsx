import type { ReactElement } from "react";

import { ChipMenuSlot } from "./chip-menu-slot.js";
import { ComposerBar } from "./composer-bar.js";
import { ComposerChips } from "./composer-chips.js";
import { DropHint } from "./drop-hint.js";
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
  const { openStarter } = lib.openFlows;
  const { addImages, removeImage, removeReference } = attach;
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
        images={attach.images}
        references={attach.references}
        onRemoveImage={removeImage}
        onRemoveReference={removeReference}
      />
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
        onFiles={addImages}
        plusActions={ui.plusActions}
        locationLabel={lib.locationLabel}
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
      />
    </form>
  );
};

export { HomeComposer };
