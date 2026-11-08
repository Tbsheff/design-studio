import type { ComponentProps, ReactElement } from "react";
import { Suspense, useCallback, useMemo } from "react";

import { frameLabelOf, jumpToFrame } from "../../platform/stage-dom.js";
import { AnimationEntry } from "../animation/index.js";
import { ImportPageSlot, importPageItems } from "../page-import/index.js";
import { ReviewEntry } from "../review/review-entry.js";
import { ScenarioSection } from "../scenario/index.js";
import { FindPanelSlot, useFindHost } from "../text-search/index.js";
import { MatrixSlot } from "../viewport/index.js";
import { CanvasBody } from "./canvas-body.js";
import { CanvasChrome } from "./canvas-chrome.js";
import { CanvasCommandsSlot } from "./canvas-commands-slot.js";
import { canvasClass } from "./canvas-helpers.js";
import type { ViewProps } from "./canvas-types.js";
import { CheckResults } from "./stage-parts.js";
import { useCanvasEdits } from "./use-canvas-edits.js";
import { useCanvasPreview } from "./use-canvas-preview.js";
import { useCanvasStage } from "./use-canvas-stage.js";
import { useCanvasWiring } from "./use-canvas-wiring.js";
import { useChromeProps } from "./use-chrome-props.js";
import type { ChromeExtra } from "./use-chrome-props.js";

interface ViewSlots {
  readonly extra: ChromeExtra;
  readonly findHost: ReturnType<typeof useFindHost>;
}

const renderScenarioSlot = (
  args: ComponentProps<typeof ScenarioSection>
): ReactElement => (
  <ScenarioSection
    projectId={args.projectId}
    directionId={args.directionId}
    frameId={args.frameId}
  />
);

const useViewSlots = (
  props: ViewProps,
  text: ReturnType<typeof useCanvasStage>,
  pv: ReturnType<typeof useCanvasPreview>
): ViewSlots => {
  const { projectId, directionId } = props;
  const { active, canvasFrames, pz } = text;

  const findHost = useFindHost({
    enabled: directionId !== null,
    frames: canvasFrames,
    post: pv.frames.post,
  });

  const matrix = useMemo(
    () => (
      <Suspense fallback={null}>
        <MatrixSlot
          projectId={projectId}
          directionId={directionId}
          frame={active}
          frameLabelOf={frameLabelOf}
          onJumpToFrame={jumpToFrame}
        />
      </Suspense>
    ),
    [active, directionId, projectId]
  );

  const renderImport = useCallback(
    (onClose: () => void) => {
      if (directionId === null) {
        return null;
      }

      return (
        <ImportPageSlot
          projectId={projectId}
          directionId={directionId}
          frames={canvasFrames}
          zoom={pz}
          onClose={onClose}
        />
      );
    },
    [canvasFrames, directionId, projectId, pz]
  );

  const importPage = useMemo(
    () => ({ items: importPageItems, render: renderImport }),
    [renderImport]
  );

  const extra = useMemo(() => ({ importPage, matrix }), [importPage, matrix]);

  return { extra, findHost };
};

const CanvasView = (props: ViewProps): ReactElement => {
  const stage = useCanvasStage(props);
  const preview = useCanvasPreview(props, stage);
  const edits = useCanvasEdits(props, stage, preview);
  const wiring = useCanvasWiring(props, stage, preview, edits);
  const { extra, findHost } = useViewSlots(props, stage, preview);
  const chrome = useChromeProps(props, stage, wiring, extra);
  const { projectId, directionId, commandsHost } = props;
  const { active, check, comment, layersOpen, live, protoOn } = stage;
  const { frames } = preview;

  return (
    <div className={canvasClass(preview.inline.editing)}>
      <CanvasChrome chrome={chrome} />
      {wiring.appCanvas.bar}
      <CheckResults projectId={projectId} check={check} />
      <FindPanelSlot
        projectId={projectId}
        directionId={directionId}
        host={findHost}
      />
      <ReviewEntry
        projectId={projectId}
        directionId={directionId}
        frame={active}
        live={live}
        running={props.running}
        lastChange={props.lastChange}
        post={frames.post}
        shell={props.shell}
        toolKey={`${protoOn}-${comment.on}-${layersOpen}`}
      />
      {directionId !== null && (
        <Suspense fallback={null}>
          <AnimationEntry
            directionId={directionId}
            post={frames.post}
            projectId={projectId}
            selector={props.selection[0]?.selector ?? null}
          />
        </Suspense>
      )}
      {edits.previewMenu.menu}
      {commandsHost && (
        <CanvasCommandsSlot host={commandsHost} input={wiring.commandsInput} />
      )}
      <CanvasBody
        props={props}
        stage={stage}
        preview={preview}
        edits={edits}
        wiring={wiring}
        renderSlot={renderScenarioSlot}
      />
    </div>
  );
};

export { CanvasView };
