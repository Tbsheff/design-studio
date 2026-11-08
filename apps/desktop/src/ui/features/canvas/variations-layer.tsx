import type {
  Direction,
  DirectionVariation,
  Project,
  RunStatus,
} from "@design-studio/contracts";
import type { ElementScope } from "@design-studio/contracts/element-variants";
import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";
import { useState, useSyncExternalStore } from "react";

import { errorText } from "../../api.js";
import type { RunMap } from "../chat/run-state-model.js";
import { ElementVariantsDialog } from "../inspector/element-variants-dialog.js";
import { canvasStore } from "./canvas-frames-model.js";
import type { CanvasDirections } from "./canvas-types.js";
import {
  framesOnCanvas,
  keepVariationFrame,
  showVariationFrames,
} from "./canvas-variations-model.js";
import { copy } from "./copy.js";
import { budgetFor, money } from "./use-variations.js";
import type { VariationsState } from "./use-variations.js";
import { VariationBriefCard } from "./variation-brief-card.js";
import type { FrameVariation } from "./variation-controls.js";
import { groupOf } from "./variations-api.js";

interface GroupRun {
  status: RunStatus | null;
  costUsd: number;
  running: boolean;
  error: string | null;
}

const groupRun = (runs: RunMap, directionId: string): GroupRun => {
  const list = Object.values(runs)
    .filter((run) => run.directionId === directionId)
    .sort(
      (runView, runViewValue) => runView.startedAt - runViewValue.startedAt
    );

  const latest = list.at(-1);

  const costUsd = list.reduce(
    (sum, run) => sum + (run.summary?.costUsd ?? 0),
    0
  );

  return {
    costUsd,
    error: latest?.summary?.error ?? null,
    running: list.some((run) => run.status === "running"),
    status: latest?.status ?? null,
  };
};

const labelOf = (direction: Direction): string =>
  direction.variation?.label ?? direction.name.slice(0, 1);

const keptText = (direction: Direction | undefined): string =>
  `Kept ${direction?.name ?? "this variation"}. The other variations stay in Versions as directions.`;

const useShownGroup = (
  project: Project,
  state: VariationsState,
  direction: Direction | null
): Direction[] => {
  const groupId = direction?.variation?.groupId ?? state.groupId;
  const group = groupOf(project, groupId);
  const ids = group.map((directionValue) => directionValue.id);

  const onCanvas = useSyncExternalStore(canvasStore.subscribe, () =>
    framesOnCanvas(project.id, ids)
  );

  if (direction?.variation || onCanvas > 0) {
    return group;
  }

  return [];
};

interface TopProps {
  state: VariationsState;
  project: Project;
  direction: Direction | null;
  runs?: RunMap;
}

const VariationBar = ({
  state,
  project,
  direction,
  group,
  runs,
}: TopProps & { group: Direction[] }): ReactElement | null => {
  const [cancelError, setCancelError] = useState<string | null>(null);
  const first = group[0]?.variation;

  if (!first) {
    return null;
  }

  let variation: DirectionVariation | null = null;

  if (direction?.variation?.groupId === first.groupId) {
    variation = direction.variation;
  }

  const groupRuns = group.map((direction3) =>
    groupRun(runs ?? {}, direction3.id)
  );

  const total = groupRuns.reduce((sum, run) => sum + run.costUsd, 0);
  const anyRunning = groupRuns.some((run) => run.running);

  const firstRun = Object.values(runs ?? {}).find(
    (run) =>
      run.request?.variation &&
      group.some((direction4) => direction4.id === run.directionId)
  );

  const budget = budgetFor(
    project,
    firstRun?.request?.level ?? project.settings.defaultLevel,
    group.length
  );

  const showAll = (): void => {
    state.keepNotice(null);
    showVariationFrames(
      project.id,
      group.map((direction5) => direction5.id),
      direction?.id ?? null,
      false
    );
  };

  const cancelAll = async (): Promise<void> => {
    setCancelError(null);

    try {
      await state.cancelAll(first.groupId);
    } catch (error) {
      setCancelError(
        `Could not cancel the runs. ${errorText(error)} Try again.`
      );
    }
  };

  let content: ReactNode = (
    <>
      <Icon name="compare" size={14} />
      <strong className="variation-bar-title">
        {group.length}
        {copy.variations}
      </strong>
      <span className="truncate variation-bar-prompt">{first.prompt}</span>
    </>
  );

  if (variation) {
    content = (
      <>
        <span className="badge accent">{variation.label}</span>
        <span className="truncate">
          {variation.title}
          {copy.oneOf}
          {variation.count}
          {copy.variations}
        </span>
      </>
    );
  }

  let content2 = " spent";

  if (budget.total !== null) {
    content2 = ` of ${money(budget.total)}`;
  }

  return (
    <>
      <div className="variation-bar" data-testid="variation-bar">
        {content}
        <div className="spacer" />
        <span className="variation-bar-total" data-testid="variations-total">
          {money(total)}
          {content2}
        </span>
        {anyRunning && (
          <button
            type="button"
            className="btn small danger has-icon"
            onClick={() => void cancelAll()}
          >
            <Icon name="stop" size={14} />
            {copy.cancelAll}
          </button>
        )}
        <button
          type="button"
          className="btn small has-icon"
          onClick={showAll}
          data-tip={copy.putEveryVariation}
        >
          <Icon name="compare" size={14} />
          {copy.showAll}
        </button>
      </div>
      {(state.notice || cancelError) && (
        <div className="variations-notice alert inline" role="status">
          <span>{cancelError ?? state.notice}</span>
          <button
            type="button"
            className="icon-btn small"
            aria-label={copy.dismiss}
            onClick={() => {
              if (cancelError) {
                return setCancelError(null);
              }

              return state.clearNotice();
            }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
    </>
  );
};

const VariationsTop = (props: TopProps): ReactElement => {
  const { state, project, direction } = props;
  const group = useShownGroup(project, state, direction);

  return (
    <>
      {group.length > 0 && <VariationBar {...props} group={group} />}
      {state.kept && (
        <div
          className="variations-notice alert inline"
          role="status"
          data-testid="variation-kept"
        >
          <span>{state.kept}</span>
          <button
            type="button"
            className="icon-btn small"
            aria-label={copy.dismiss}
            onClick={() => state.keepNotice(null)}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
      {state.ask && !state.draft && (
        <div className="variation-card-layer">
          <ElementVariantsDialog
            project={project}
            element={state.ask}
            onCancel={() => state.askElement(null)}
            onStart={(note, count) => {
              const element = state.ask;

              if (element) {
                void state.proposeElement(
                  element,
                  note,
                  count,
                  project.settings.defaultLevel
                );
              }
            }}
          />
        </div>
      )}
      {state.draft && (
        <div className="variation-card-layer">
          <VariationBriefCard
            project={project}
            draft={state.draft}
            onEdit={state.editBrief}
            onRemove={state.removeBrief}
            onStart={state.start}
            onSkip={state.skip}
            onDismiss={state.dismiss}
          />
        </div>
      )}
    </>
  );
};

interface CanvasProps {
  state: VariationsState;
  project: Project;
  runs: RunMap;
  setDirectionId: (id: string) => void;
}

const keepBlocker = (
  variation: DirectionVariation,
  run: GroupRun,
  error: string | null
): string | null => {
  if (variation.settled === "kept") {
    return "Already kept in the main design";
  }

  if (variation.settled === "discarded") {
    return "Another variant was kept";
  }

  if (run.running) {
    return "Wait for this variant to finish";
  }

  if (error || run.status === "failed") {
    return "This variant failed, so it cannot be kept";
  }

  if (run.status !== "completed") {
    return "This variant has no finished run";
  }

  return null;
};

const elementVariation = ({
  state,
  project,
  setDirectionId,
  direction,
  variation,
  scope,
  group,
  run,
}: ElementVariationInput): FrameVariation => {
  const error =
    variation.rejected ?? (run.status === "failed" ? run.error : null);

  return {
    costText: `${money(run.costUsd)} spent`,
    error,
    keepBlocked: keepBlocker(variation, run, error),
    label: variation.label,
    onKeep: async () => {
      await state.keepElement(variation.groupId, direction.id);
      keepVariationFrame(
        project.id,
        scope.sourceDirectionId,
        group.map((direction2) => direction2.id)
      );
      setDirectionId(scope.sourceDirectionId);
      state.setGroupId(null);
      state.keepNotice(
        `Kept variant ${variation.label} (${variation.title}) in the design as one version. The other variants were discarded.`
      );
    },
    onMix: async () => undefined,
    scoped: true,
    siblings: [],
    status: run.status,
    title: variation.title,
  };
};

const canvasVariations = ({
  state,
  project,
  runs,
  setDirectionId,
}: CanvasProps): CanvasDirections => ({
  list: project.directions,
  onActivate: setDirectionId,
  variationOf: (directionId) => {
    const direction = project.directions.find(
      (direction6) => direction6.id === directionId
    );

    const variation = direction?.variation;

    if (!direction || !variation) {
      return;
    }

    const group = groupOf(project, variation.groupId);
    const run = groupRun(runs, directionId);

    if (variation.scope) {
      return elementVariation({
        direction,
        group,
        project,
        run,
        scope: variation.scope,
        setDirectionId,
        state,
        variation,
      });
    }

    return {
      costText: `${money(run.costUsd)} spent`,
      label: variation.label,
      onKeep: () => {
        keepVariationFrame(
          project.id,
          directionId,
          group.map((direction3) => direction3.id)
        );
        setDirectionId(directionId);
        state.setGroupId(variation.groupId);
        state.keepNotice(keptText(direction));
      },
      onMix: async (to, element) => {
        await state.mix(
          directionId,
          to,
          element,
          project.settings.defaultLevel
        );
      },
      siblings: group
        .filter((direction4) => direction4.id !== directionId)
        .map((direction5) => ({
          id: direction5.id,
          label: labelOf(direction5),
          title: direction5.variation?.title ?? direction5.name,
        })),
      status: run.status,
      title: variation.title,
    };
  },
});

interface ElementVariationInput {
  state: VariationsState;
  project: Project;
  setDirectionId: (id: string) => void;
  direction: Direction;
  variation: DirectionVariation;
  scope: ElementScope;
  group: Direction[];
  run: GroupRun;
}

export { VariationsTop, canvasVariations };
