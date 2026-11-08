import type { ReactElement } from "react";

import { promptPlaceholder, reasonId } from "./home-model.js";
import { PromptArea } from "./prompt-area.js";
import type { HomeScreen } from "./use-home-screen.js";

const HomePrompt = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement => {
  const { composer, draft, modules, refs, submit, ui } = screen;
  const { chip } = composer.flow.app;
  const { composerRef, promptRef, slashKeys } = refs;
  const { create } = submit;
  const { onPromptPaste } = composer.attach;
  const { setPrompt } = draft;
  const { level, model, onLevel, onModel } = ui.modelSettings;

  return (
    <>
      <PromptArea
        textareaRef={promptRef}
        value={draft.prompt}
        onChange={setPrompt}
        onSubmit={create}
        onPaste={onPromptPaste}
        describedBy={reasonId(ui.sendBlocker)}
        menuKeys={slashKeys}
        placeholder={promptPlaceholder(chip, ui.isEmpty)}
      />
      {modules.slashMod && (
        <modules.slashMod.HomeSlashMenu
          prompt={draft.prompt}
          setPrompt={setPrompt}
          level={level}
          onLevel={onLevel}
          model={model}
          onModel={onModel}
          keys={slashKeys}
          promptRef={promptRef}
          composerRef={composerRef}
        />
      )}
    </>
  );
};

export { HomePrompt };
