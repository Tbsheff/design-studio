import type { ComponentProps } from "react";

import { canvasVariations } from "../../features/canvas/variations-layer";
import { uiStore } from "../../platform/storage";
import { useCanvasCommandsHost } from "../canvas-commands-host";
import type { CenterView } from "../shell/center-view";
import { nameOf, whenDirection } from "./project-model";
import { neverRan, runStepOf } from "./run-model";
import type { StudioCtx } from "./studio-context";
import { hasDarkMode, tokenEntries } from "./token-model";

type CanvasProps = ComponentProps<typeof CenterView>["canvas"];

const shareKindOf = (project: StudioCtx["project"]): "site" | "viewer" => {
  if (project.kind === "html" && !project.app) {
    return "site";
  }

  return "viewer";
};

const makeStatesOf = (
  directionId: string | null,
  makeStates: StudioCtx["run"]["makeStates"]
): Pick<CanvasProps, "onMakeStates"> => {
  if (directionId) {
    return { onMakeStates: makeStates };
  }

  return {};
};

const layersHostOf = (ui: StudioCtx["ui"]): HTMLDivElement | null => {
  if (ui.paneCollapsed) {
    return null;
  }

  return ui.layersHost;
};

const shellProps = (ctx: StudioCtx): CanvasProps["shell"] => {
  const { project, ui, panes, core, run, openShip } = ctx;
  const { direction } = core;
  const did = core.directionId;

  return {
    canExport: core.exporter.canOpen,
    directionName: nameOf(direction),
    layersHost: layersHostOf(ui),
    onAskAgent: (text: string): Promise<boolean> => {
      ui.draft.set(text);

      return panes.showPane("chat");
    },
    onExpandPane: (): void => uiStore.set({ paneCollapsed: false }),
    onExport: core.exporter.openHead,
    onPane: panes.canvasPane,
    onShareLink: (mode?: "link" | "publish"): void =>
      ui.setShareTarget({
        directionId: direction?.id ?? null,
        kind: shareKindOf(project),
        mode: mode ?? "link",
        projectId: ctx.projectId,
        versionId: direction?.headVersionId ?? null,
      }),
    onShip: openShip,
    onTweak: whenDirection(did, run.tweak),
    pane: panes.panel.tab,
    paneCollapsed: ui.paneCollapsed,
  };
};

const onTextCommit =
  (ctx: StudioCtx): ((selector: string, text: string) => void) =>
  (selector: string, text: string): void => {
    const { ui } = ctx;
    const [target] = ui.selection;
    const single = ui.selection.length === 1 && target?.selector === selector;

    if (single && ui.editControl.current?.commitText(selector, text)) {
      return;
    }

    ui.port.current?.post({ type: "preview-reset" });
  };

const canvasProps = (ctx: StudioCtx): CanvasProps => {
  const { project, ui, core, run } = ctx;
  const { data, direction, directionRuns } = core;
  const did = core.directionId;

  return {
    app: project.app,
    commandsHost: useCanvasCommandsHost,
    commentTools: {
      components: core.componentList.components,
      onSteer: run.runControls.onSteer,
      tokens: tokenEntries(core.tokens),
    },
    comments: core.comments,
    darkPreview: hasDarkMode(core.tokens),
    directionId: did,
    directions: canvasVariations({
      project: ctx.project,
      runs: core.runs,
      setDirectionId: data.setDirectionId,
      state: core.variations,
    }),
    headVersionId: direction?.headVersionId ?? null,
    kind: project.kind,
    lastChange: data.lastChange,
    noRuns: neverRan(data.hasRunsLoaded, directionRuns),
    onError: data.addError,
    onFrameChange: data.clearFrameErrors,
    onInlinePrompt: whenDirection(did, run.tweak),
    onSource: ui.setSource,
    onTextCommit: onTextCommit(ctx),
    port: ui.port,
    projectId: ctx.projectId,
    runStep: runStepOf(core.activeRun, direction),
    running: core.activeRun !== null,
    selection: ui.selection,
    setSelection: ui.setSelection,
    shell: shellProps(ctx),
    source: ui.source,
    ...makeStatesOf(did, run.makeStates),
  };
};

export { canvasProps };
