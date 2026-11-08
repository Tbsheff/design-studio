import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import type { ChromeImportPage, ChromeProps } from "./canvas-chrome-menu.js";
import { frameDirection } from "./canvas-direction-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasStageProps } from "./canvas-stage-types.js";
import type { ViewProps } from "./canvas-types.js";

interface ChromeExtra {
  readonly importPage: ChromeImportPage;
  readonly matrix: ReactNode;
}

type StageState = CanvasStageProps["stage"];

type WiringState = CanvasStageProps["wiring"];

const useChromeView = (
  props: ViewProps,
  stage: StageState,
  wiring: WiringState
): ChromeProps["view"] => {
  const { check, draw } = stage;
  const { darkSwitch, lofiSwitch, proto } = wiring;

  return useMemo(
    () => ({
      checking: check.checking,
      drawMode: draw.toolbarMode,
      hasHead: props.headVersionId !== null,
      links: proto.viewToggle,
      lofi: lofiSwitch,
      onCheck: check.run,
      onSource: props.onSource,
      onToggleDraw: draw.toggle,
      source: props.source,
      theme: darkSwitch,
    }),
    [
      check.checking,
      check.run,
      draw.toolbarMode,
      draw.toggle,
      props.headVersionId,
      props.onSource,
      props.source,
      proto.viewToggle,
      lofiSwitch,
      darkSwitch,
    ]
  );
};

const useChromeProps = (
  props: ViewProps,
  stage: StageState,
  wiring: WiringState,
  extra: ChromeExtra
): ChromeProps => {
  const chromeView = useChromeView(props, stage, wiring);
  const { directionId } = props;
  const { labelProps, proto } = wiring;
  const { protoOn, setProto, stageRef } = stage;

  const toLabel = useCallback(
    (frame: CanvasFrame) =>
      labelProps(frame, frameDirection(frame, directionId)),
    [labelProps, directionId]
  );

  const getStage = useCallback(() => stageRef.current, [stageRef]);

  const protoControl = useMemo(
    () => ({ on: protoOn, play: proto.play, set: setProto }),
    [protoOn, proto.play, setProto]
  );

  return useMemo(
    () => ({
      active: stage.active,
      addFrame: wiring.addFrameAt,
      comment: stage.comment,
      directionId: props.directionId,
      frames: stage.canvasFrames,
      importPage: extra.importPage,
      kind: props.kind,
      label: toLabel,
      layout: stage.layout,
      live: stage.live,
      matrix: extra.matrix,
      presentUrl: stage.liveUrl,
      projectId: props.projectId,
      proto: protoControl,
      sandbox: wiring.sandbox,
      selectMode: stage.selectMode,
      selection: props.selection,
      setSelectMode: stage.setSelectMode,
      shell: props.shell,
      stage: getStage,
      toggleEdit: stage.toggleEdit,
      ui: stage.ui,
      view: chromeView,
      zoom: stage.pz,
    }),
    [
      stage,
      wiring.addFrameAt,
      wiring.sandbox,
      props,
      extra,
      toLabel,
      protoControl,
      getStage,
      chromeView,
    ]
  );
};

export { useChromeProps };

export type { ChromeExtra };
