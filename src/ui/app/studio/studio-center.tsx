import { createElement, useCallback } from "react";
import type { ReactElement } from "react";

import type { Version } from "../../../shared/contracts";
import { DraftBar } from "../../components/DraftBar";
import { ImproveControl } from "../../components/DraftImprove";
import { CenterView, UnfinishedSlot } from "../../components/StudioParts";
import { VariationsTop } from "../../components/VariationsLayer";
import { improveProps, saveHandlerOf, unfinishedProps } from "./center-bars";
import { canvasProps } from "./center-props";
import type { StudioCtxProps } from "./studio-context";

const comparedOf = (ctx: StudioCtxProps["ctx"]): Version[] =>
  ctx.ui.compare.map(
    (picked): Version =>
      ctx.core.versions.find((entry): boolean => entry.id === picked.id) ??
      picked
  );

const StudioCenter = ({ ctx }: StudioCtxProps): ReactElement => {
  const { projectId, project, ui, core } = ctx;
  const { data, direction, draftChrome, activeRun } = core;
  const [left, right] = comparedOf(ctx);
  const improve = createElement(ImproveControl, improveProps(ctx));
  const unfinished = createElement(UnfinishedSlot, unfinishedProps(ctx));
  const { setCompareOpen } = ui;

  const handleCloseCompare = useCallback(
    (): void => setCompareOpen(false),
    [setCompareOpen]
  );

  return (
    <main className="center pane-canvas ui-inset">
      <DraftBar
        project={project}
        state={core.designSystem.state}
        lastChange={data.lastChange}
        onSave={saveHandlerOf(ctx)}
        lastRun={core.improveRun}
        reading={draftChrome.reading}
        running={activeRun !== null}
        improve={improve}
      />
      {unfinished}
      <VariationsTop
        state={core.variations}
        project={project}
        direction={direction}
        runs={core.runs}
      />
      <CenterView
        projectId={projectId}
        kind={project.kind}
        compareOpen={ui.compareOpen}
        left={left}
        right={right}
        versions={core.versions}
        onCloseCompare={handleCloseCompare}
        canvas={canvasProps(ctx)}
      />
    </main>
  );
};

export { StudioCenter };
