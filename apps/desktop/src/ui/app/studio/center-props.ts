import type { ComponentProps } from "react";

import { canvasVariations } from "../../features/canvas";
import {
  loadPlayCommentLayer,
  PlayCommentLayer,
} from "../../features/comments";
import { useCanvasCommandsHost } from "../canvas-commands-host";
import type { CenterView } from "../shell/center-view";
import { nameOf } from "./project-model";
import { neverRan, runStepOf } from "./run-model";
import { renderSpeedSlot } from "./speed-slot";
import type { StudioCtx } from "./studio-context";
import { tokenEntries } from "./token-model";

type CanvasProps = ComponentProps<typeof CenterView>["canvas"];

type CanvasShell = NonNullable<CanvasProps["shell"]>;

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

const topBarOf = (ui: StudioCtx["ui"]): CanvasShell["topBar"] => {
  const { toolsHost, topEnd, topStart, zoomHost } = ui;

  if (toolsHost && topEnd && topStart && zoomHost) {
    return { end: topEnd, start: topStart, tools: toolsHost, zoom: zoomHost };
  }

  return null;
};

const shellProps = (ctx: StudioCtx): CanvasShell => {
  const { project, ui, panes, core, openShip } = ctx;
  const { direction } = core;
  const column = ui.editorColumn;

  return {
    canExport: core.exporter.canOpen,
    directionName: nameOf(direction),
    isCommentsShown: ui.isCommentsShown,
    isInspectorOpen: panes.isInspectorOpen,
    isLayersOpen: column.isOpen && column.tab === "layers",
    layersHost: ui.layersHost,
    onAskAgent: (text: string): void => {
      ui.draft.set(text);
    },
    onCloseLayers: panes.closeColumn,
    onComments: panes.showComments,
    onExport: core.exporter.openHead,
    onInspector: panes.showInspector,
    onLayers: (): void => panes.openColumn("layers"),
    onShareLink: (mode?: "link" | "publish"): void =>
      ui.setShareTarget({
        directionId: direction?.id ?? null,
        kind: shareKindOf(project),
        mode: mode ?? "link",
        projectId: ctx.projectId,
        versionId: direction?.headVersionId ?? null,
      }),
    onShip: openShip,
    pagesHost: ui.pagesHost,
    renderSpeed: renderSpeedSlot,
    topBar: topBarOf(ui),
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
  void loadPlayCommentLayer();

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
    darkPreview: true,
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
    onSource: ui.setSource,
    onTextCommit: onTextCommit(ctx),
    playComments: PlayCommentLayer,
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
