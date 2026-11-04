import { Suspense } from "react";

import { formatAnswers } from "@design-studio/actions/_core/clarify";
import { uiStore } from "../../platform/storage.js";
import { ChipMenuSlot } from "./chip-menu-slot.js";
import { ComposerBar } from "./composer-bar.js";
import { DropHint } from "./drop-hint.js";
import { HeroNotes } from "./hero-notes.js";
import { ComposerChips } from "./home-composer-parts.js";
import { Header } from "./home-header.js";
import { focusPrompt, promptPlaceholder, reasonId } from "./home-model.js";
import { HomeOverlays } from "./home-overlays.js";
import { ClarifyForm } from "./lazy-parts.js";
import { LibraryArea } from "./library-area.js";
import { Library } from "./library-panel.js";
import { PromptArea } from "./prompt-area.js";
import { StarterRow } from "./starter-row.js";
import { TemplatesSection } from "./templates-section.js";
import { useHomeScreen } from "./use-home-screen.js";

function Home({ onOpen }: { onOpen: (projectId: string) => void }) {
  const {
    actions,
    addAppFolder,
    addFolder,
    addImages,
    advancedOpened,
    app,
    build,
    busy,
    changeKind,
    chipDoctor,
    chipLead,
    chipRef,
    chooser,
    clearToast,
    create,
    designMd,
    doctor,
    dragging,
    dropHandlers,
    empty,
    extras,
    fileRef,
    folderPop,
    formError,
    health,
    homeDir,
    homeRef,
    images,
    kind,
    lastPackId,
    library,
    listError,
    loadProjects,
    location,
    locationLabel,
    modelSettings,
    modelSizes,
    modelValue,
    onPromptPaste,
    openChip,
    openSample,
    openStarter,
    pack,
    packs,
    pickTemplate,
    plusActions,
    prefs,
    projects,
    prompt,
    putFolder,
    query,
    questions,
    references,
    removeImage,
    removeReference,
    rootDrop,
    searchRef,
    sendBlocker,
    setAppMenu,
    setDesignMd,
    setFolderPop,
    setFormError,
    setLocation,
    setPrompt,
    setQuery,
    setQuestions,
    setSettingsDraft,
    setTrashOpen,
    settingsDraft,
    shownAppMenu,
    slashKeys,
    slashMod,
    template,
    templates,
    toast,
    trashOpen,
    windowDrag,
    workspaces,
  } = useHomeScreen(onOpen);

  return (
    <div
      className="home"
      data-drop={windowDrag || undefined}
      ref={homeRef}
      {...rootDrop}
    >
      <Header onTrash={() => setTrashOpen(true)} />
      <main className="home-main">
        <section className="home-hero">
          {empty ? (
            <h1 className="ui-display">What should we design?</h1>
          ) : (
            <h1 className="sr-only">Home</h1>
          )}
          <div className="home-card" ref={chipRef}>
            <form
              className={`ui-composer home-composer${dragging ? " dragging" : ""}`}
              onSubmit={create}
              {...dropHandlers}
            >
              <ComposerChips
                lead={chipLead}
                images={images}
                references={references}
                onRemoveImage={removeImage}
                onRemoveReference={removeReference}
              />
              <ChipMenuSlot
                shown={shownAppMenu.shown !== null}
                closing={shownAppMenu.closing}
                chip={app.chip}
                homeDir={homeDir}
                chipRef={chipRef}
                onClose={() => setAppMenu(false)}
                onChange={app.update}
                onTokensOnly={() => {
                  setAppMenu(false);
                  void openChip(prompt.trim(), true);
                }}
              />
              <PromptArea
                value={prompt}
                onChange={setPrompt}
                onSubmit={create}
                onPaste={onPromptPaste}
                describedBy={reasonId(sendBlocker)}
                menuKeys={slashKeys}
                placeholder={promptPlaceholder(app.chip, empty)}
              />
              {slashMod && (
                <slashMod.HomeSlashMenu
                  prompt={prompt}
                  setPrompt={setPrompt}
                  level={modelSettings.level}
                  onLevel={modelSettings.onLevel}
                  model={modelSettings.model}
                  onModel={modelSettings.onModel}
                  keys={slashKeys}
                  home={homeRef}
                />
              )}
              <DropHint on={dragging} />
              <StarterRow
                template={template}
                busy={busy}
                onOpen={(starter) => void openStarter(starter)}
              />
              <ComposerBar
                fileRef={fileRef}
                onFiles={addImages}
                plusActions={plusActions}
                locationLabel={locationLabel}
                packs={packs}
                pack={pack}
                kind={kind}
                onKind={changeKind}
                modelValue={modelValue}
                modelSizes={modelSizes}
                modelSettings={modelSettings}
                busy={busy}
                sendDisabled={sendBlocker}
                app={{
                  chip: app.chip,
                  onAddFolder: () => void addAppFolder(),
                  onDoctor: () => chipDoctor(prompt.trim()),
                  folderPop,
                  onFolderPick: putFolder,
                  onFolderClose: () => setFolderPop(false),
                }}
              />
            </form>
            {questions && !app.chip && (
              <Suspense fallback={null}>
                <ClarifyForm
                  questions={questions}
                  busy={busy === "create"}
                  onBuild={(answers) =>
                    void build(formatAnswers(prompt, answers))
                  }
                  onSkip={() => void build(prompt.trim())}
                  onCancel={() => {
                    setQuestions(null);
                    focusPrompt(homeRef.current);
                  }}
                />
              </Suspense>
            )}
            {!questions && prefs.templatesShown && (
              <TemplatesSection
                templates={templates}
                selected={template?.id ?? null}
                disabled={busy !== null}
                onPick={pickTemplate}
              />
            )}
          </div>
          <HeroNotes
            windowDrag={windowDrag}
            formError={formError}
            onClearError={() => setFormError(null)}
          />
          {extras && !app.chip && (
            <extras.ComposerFoot
              workspaces={workspaces}
              location={location}
              prompt={prompt}
              chooser={chooser}
              onLocation={setLocation}
              onAddFolder={addFolder}
              advanced={{
                opened: advancedOpened,
                draft: settingsDraft,
                onDraft: setSettingsDraft,
                designMd,
                onDesignMd: setDesignMd,
                onError: setFormError,
              }}
              onHiddenMoved={() => void loadProjects()}
            />
          )}
        </section>
        <LibraryArea
          empty={empty}
          busy={busy !== null}
          listError={listError}
          onRetry={() => void loadProjects()}
          onUse={putFolder}
          onSample={() => void openSample()}
          onStarter={(starter) => void openStarter(starter)}
        >
          {projects !== null && (
            <Library
              lib={library}
              projects={projects}
              health={health}
              homeDir={homeDir}
              actions={actions}
              packs={packs}
              pack={pack}
              query={query}
              onQuery={setQuery}
              searchRef={searchRef}
              listError={listError}
              onPickPack={(id) => {
                uiStore.set({ lastPackId: id });
                focusPrompt(homeRef.current);
              }}
            />
          )}
        </LibraryArea>
      </main>
      <HomeOverlays
        trashOpen={trashOpen}
        onCloseTrash={() => setTrashOpen(false)}
        onRestored={() => void loadProjects()}
        doctor={doctor}
        toast={toast}
        onToastDone={clearToast}
      />
    </div>
  );
}

export { Home };
