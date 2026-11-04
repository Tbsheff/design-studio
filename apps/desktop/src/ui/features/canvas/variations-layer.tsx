import type {
  Direction,
  DirectionVariation,
  Project,
  RunStatus,
} from "@design-studio/contracts";
import type { ElementScope } from "@design-studio/contracts/element-variants";
import { Icon } from "@design-studio/ui";
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

function groupRun(runs: RunMap, directionId: string): GroupRun {
  const list = Object.values(runs)
    .filter((run) => run.directionId === directionId)
    .sort((a, b) => a.startedAt - b.startedAt);

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
}

function labelOf(direction: Direction): string {
  return direction.variation?.label ?? direction.name.slice(0, 1);
}

function keptText(direction: Direction | undefined): string {
  return `Kept ${direction?.name ?? "this variation"}. The other variations stay in Versions as directions.`;
}

function useShownGroup(
  project: Project,
  state: VariationsState,
  direction: Direction | null
): Direction[] {
  const groupId = direction?.variation?.groupId ?? state.groupId;
  const group = groupOf(project, groupId);
  const ids = group.map((d) => d.id);

  const onCanvas = useSyncExternalStore(canvasStore.subscribe, () =>
    framesOnCanvas(project.id, ids)
  );

  return direction?.variation || onCanvas > 0 ? group : [];
}

interface TopProps {
  state: VariationsState;
  project: Project;
  direction: Direction | null;
  runs?: RunMap;
}

function VariationBar({
  state,
  project,
  direction,
  group,
  runs,
}: TopProps & { group: Direction[] }) {
  const [cancelError, setCancelError] = useState<string | null>(null);
  const first = group[0]?.variation;

  if (!first) {
    return null;
  }

  const variation =
    direction?.variation?.groupId === first.groupId
      ? direction.variation
      : null;

  const groupRuns = group.map((d) => groupRun(runs ?? {}, d.id));
  const total = groupRuns.reduce((sum, run) => sum + run.costUsd, 0);
  const anyRunning = groupRuns.some((run) => run.running);

  const firstRun = Object.values(runs ?? {}).find(
    (run) =>
      run.request?.variation && group.some((d) => d.id === run.directionId)
  );

  const budget = budgetFor(
    project,
    firstRun?.request?.level ?? project.settings.defaultLevel,
    group.length
  );

  const showAll = () => {
    state.keepNotice(null);
    showVariationFrames(
      project.id,
      group.map((d) => d.id),
      direction?.id ?? null,
      false
    );
  };

  const cancelAll = async () => {
    setCancelError(null);

    try {
      await state.cancelAll(first.groupId);
    } catch (error) {
      setCancelError(
        `Could not cancel the runs. ${errorText(error)} Try again.`
      );
    }
  };

  return (
    <>
      <div className="variation-bar" data-testid="variation-bar">
        {variation ? (
          <>
            <span className="badge accent">{variation.label}</span>
            <span className="truncate">
              {variation.title} · one of {variation.count} variations
            </span>
          </>
        ) : (
          <>
            <Icon name="compare" size={14} />
            <strong className="variation-bar-title">
              {group.length} variations
            </strong>
            <span className="truncate variation-bar-prompt">
              {first.prompt}
            </span>
          </>
        )}
        <div className="spacer" />
        <span className="variation-bar-total" data-testid="variations-total">
          {money(total)}
          {budget.total === null ? " spent" : ` of ${money(budget.total)}`}
        </span>
        {anyRunning && (
          <button
            className="btn small danger has-icon"
            onClick={() => void cancelAll()}
          >
            <Icon name="stop" size={14} />
            Cancel all
          </button>
        )}
        <button
          className="btn small has-icon"
          onClick={showAll}
          data-tip="Put every variation back on the canvas"
        >
          <Icon name="compare" size={14} />
          Show all
        </button>
      </div>
      {(state.notice || cancelError) && (
        <div className="variations-notice alert inline" role="status">
          <span>{cancelError ?? state.notice}</span>
          <button
            className="icon-btn small"
            aria-label="Dismiss"
            onClick={() =>
              cancelError ? setCancelError(null) : state.clearNotice()
            }
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
    </>
  );
}

export function VariationsTop(props: TopProps) {
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
            className="icon-btn small"
            aria-label="Dismiss"
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
}

interface CanvasProps {
  state: VariationsState;
  project: Project;
  runs: RunMap;
  setDirectionId: (id: string) => void;
}

export function canvasVariations({
  state,
  project,
  runs,
  setDirectionId,
}: CanvasProps): CanvasDirections {
  return {
    list: project.directions,
    onActivate: setDirectionId,
    variationOf: (directionId) => {
      const direction = project.directions.find((d) => d.id === directionId);
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
            group.map((d) => d.id)
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
          .filter((d) => d.id !== directionId)
          .map((d) => ({
            id: d.id,
            label: labelOf(d),
            title: d.variation?.title ?? d.name,
          })),
        status: run.status,
        title: variation.title,
      };
    },
  };
}

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

function keepBlocker(
  variation: DirectionVariation,
  run: GroupRun,
  error: string | null
): string | null {
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
}

function elementVariation({
  state,
  project,
  setDirectionId,
  direction,
  variation,
  scope,
  group,
  run,
}: ElementVariationInput): FrameVariation {
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
        group.map((d) => d.id)
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
}
