import path from "node:path";

import type { RenderPage } from "../../preview/index.js";
import type {
  FrictionRecord,
  Outcome,
  PageElement,
  StepChoice,
  StepRecord,
} from "./engine/index.js";
import { toElementKey, toUnnamedFrictions } from "./engine/index.js";
import {
  applyElementAction,
  applyScroll,
  listPageElements,
  setWriteGuard,
  toBlockedCount,
} from "./walkthrough-page.js";

interface PickInput {
  readonly clicked: ReadonlySet<string>;
  readonly elements: readonly PageElement[];
  readonly history: readonly StepRecord[];
  readonly index: number;
  readonly maxSteps: number;
  readonly persona: string | null;
  readonly shotFile: string;
  readonly task: string;
  readonly url: string;
}

type PickStep = (input: PickInput) => Promise<StepChoice>;

interface WalkParams {
  readonly canWrite: boolean;
  readonly folder: string;
  readonly folderRelative: string;
  readonly maxSteps: number;
  readonly persona: string | null;
  readonly pick: PickStep;
  readonly task: string;
}

interface WalkResult {
  readonly frictions: readonly FrictionRecord[];
  readonly outcome: Outcome;
  readonly steps: readonly StepRecord[];
}

interface WalkState {
  readonly clicked: readonly string[];
  readonly frictions: readonly FrictionRecord[];
  readonly steps: readonly StepRecord[];
  readonly unnamed: readonly string[];
}

const BLOCKED_NOTE = " The write request was blocked.";

const toShotName = (index: number): string =>
  `step-${String(index).padStart(2, "0")}.png`;

const toTargetName = (choice: StepChoice): string => {
  if (choice.element === null) {
    return "";
  }

  return choice.element.name || `(${choice.element.role} with no name)`;
};

const applyChoice = async (
  page: RenderPage,
  choice: StepChoice
): Promise<void> => {
  if (choice.action === "scroll") {
    await applyScroll(page);

    return;
  }

  if (choice.element === null) {
    return;
  }

  if (choice.action === "click" || choice.action === "type") {
    await applyElementAction(
      page,
      choice.action,
      choice.element.selector,
      choice.text ?? ""
    );
  }
};

const toChoiceFriction = (
  index: number,
  choice: StepChoice
): FrictionRecord[] => {
  if (choice.friction === null) {
    return [];
  }

  return [{ ...choice.friction, step: index }];
};

const toEndFriction = (
  outcome: Outcome | null,
  index: number,
  maxSteps: number,
  choice: StepChoice
): FrictionRecord[] => {
  if (outcome === "stuck" && choice.friction === null) {
    return [
      {
        fix: "Add a clear path to the next step, such as a link or button with a name that says the task.",
        severity: "high",
        step: index,
        text: `The user got stuck: ${choice.reason}`,
      },
    ];
  }

  if (outcome === "max-steps") {
    return [
      {
        fix: "Cut the number of screens or clicks between the start and the end of the task.",
        severity: "medium",
        step: index,
        text: `The user did not finish the task in ${maxSteps} steps.`,
      },
    ];
  }

  return [];
};

const toOutcome = (
  choice: StepChoice,
  index: number,
  maxSteps: number
): Outcome | null => {
  if (choice.action === "done") {
    return "done";
  }

  if (choice.action === "stuck") {
    return "stuck";
  }

  if (index >= maxSteps) {
    return "max-steps";
  }

  return null;
};

const toNextClicked = (
  clicked: readonly string[],
  choice: StepChoice
): string[] => {
  if (choice.element === null) {
    return [...clicked];
  }

  return [...clicked, toElementKey(choice.element)];
};

const toBlockedNote = (wasBlocked: boolean): string => {
  if (wasBlocked) {
    return BLOCKED_NOTE;
  }

  return "";
};

const toUnnamedSelectors = (elements: readonly PageElement[]): string[] =>
  elements.flatMap((element) => {
    if (element.hasName) {
      return [];
    }

    return [element.selector];
  });

const toRecord = (
  params: WalkParams,
  choice: StepChoice,
  position: { readonly index: number; readonly url: string },
  wasBlocked: boolean
): StepRecord => ({
  action: choice.action,
  index: position.index,
  layerId: choice.element?.layerId ?? null,
  reason: `${choice.reason}${toBlockedNote(wasBlocked)}`,
  shotPath: path.join(params.folderRelative, toShotName(position.index)),
  targetName: toTargetName(choice),
  url: position.url,
});

const runStep = async (
  page: RenderPage,
  params: WalkParams,
  state: WalkState
): Promise<WalkResult> => {
  const stepIndex = state.steps.length + 1;
  const probe = await listPageElements(page);
  const shot = path.join(params.folder, toShotName(stepIndex));

  await page.screenshot(shot, probe.clip);

  const choice = await params.pick({
    clicked: new Set(state.clicked),
    elements: probe.elements,
    history: state.steps,
    index: stepIndex,
    maxSteps: params.maxSteps,
    persona: params.persona,
    shotFile: shot,
    task: params.task,
    url: probe.url,
  });

  const ending = toOutcome(choice, stepIndex, params.maxSteps);
  const before = await toBlockedCount(page);

  if (ending === null || ending === "max-steps") {
    await applyChoice(page, choice);
  }

  const wasBlocked = (await toBlockedCount(page)) > before;

  const unnamed = toUnnamedFrictions(
    stepIndex,
    probe.elements,
    new Set(state.unnamed)
  );

  const record = toRecord(
    params,
    choice,
    { index: stepIndex, url: probe.url },
    wasBlocked
  );

  const next: WalkState = {
    clicked: toNextClicked(state.clicked, choice),
    frictions: [
      ...state.frictions,
      ...unnamed,
      ...toChoiceFriction(stepIndex, choice),
      ...toEndFriction(ending, stepIndex, params.maxSteps, choice),
    ],
    steps: [...state.steps, record],
    unnamed: [...state.unnamed, ...toUnnamedSelectors(probe.elements)],
  };

  if (ending !== null) {
    return { frictions: next.frictions, outcome: ending, steps: next.steps };
  }

  if (!params.canWrite) {
    await setWriteGuard(page);
  }

  return runStep(page, params, next);
};

const runWalk = async (
  page: RenderPage,
  params: WalkParams
): Promise<WalkResult> => {
  if (!params.canWrite) {
    await setWriteGuard(page);
  }

  return runStep(page, params, {
    clicked: [],
    frictions: [],
    steps: [],
    unnamed: [],
  });
};

export { runWalk };

export type { PickInput, PickStep, WalkParams, WalkResult };
