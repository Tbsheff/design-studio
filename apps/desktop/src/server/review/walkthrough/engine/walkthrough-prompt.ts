import type { PageElement, StepRecord } from "./page-element.js";

interface StepPromptInput {
  readonly elements: readonly PageElement[];
  readonly history: readonly StepRecord[];
  readonly index: number;
  readonly maxSteps: number;
  readonly persona: string | null;
  readonly task: string;
  readonly url: string;
}

const WALKTHROUGH_SYSTEM = `You are a synthetic user who tests a design. You see one screenshot and a list of the visible controls. You try to finish one task like a real person who has never seen this screen.
- Pick exactly one next action: click a control, type text into a field, scroll down, say done when the task is finished, or say stuck when you cannot find a way forward.
- Use only a control id from the list. Never invent a control.
- Judge only what a real user sees. A control with no name is hard to find. Say so in "friction".
- Add "friction" when this screen slows you down, confuses you or hides the next step. Use null when the screen is fine. Give one concrete fix.
- Do not praise. Keep every text short.
- Answer with JSON only: {"action":"click"|"type"|"scroll"|"done"|"stuck","elementId":0|null,"text":"text to type"|null,"reason":"why","friction":{"severity":"high"|"medium"|"low","text":"the problem","fix":"one concrete change"}|null}.`;

const MAX_ELEMENTS = 40;

const toViewText = (isInView: boolean): string => {
  if (isInView) {
    return "in view";
  }

  return "below the fold";
};

const toNameText = (element: PageElement): string => {
  if (element.hasName) {
    return `"${element.name}"`;
  }

  return "(no name)";
};

const toElementLine = (element: PageElement): string => {
  const place = `at ${Math.round(element.box.left)},${Math.round(element.box.top)} size ${Math.round(element.box.width)}x${Math.round(element.box.height)}`;
  const view = toViewText(element.isInView);
  const name = toNameText(element);

  return `${element.id}: ${element.role} ${name} ${place}, ${view}`;
};

const toHistoryLine = (step: StepRecord): string =>
  `${step.index}. ${step.action} ${step.targetName} (${step.url})`;

const toStepText = (input: StepPromptInput): string => {
  const persona = input.persona ?? "A first-time user.";

  const history = input.history.map((step) => toHistoryLine(step)).join("\n");

  const controls = input.elements
    .slice(0, MAX_ELEMENTS)
    .map((element) => toElementLine(element))
    .join("\n");

  return [
    `Task: ${input.task}`,
    `Persona: ${persona}`,
    `Step ${input.index} of at most ${input.maxSteps}. Page: ${input.url}`,
    `Steps so far:\n${history || "none"}`,
    `Controls on this screen:\n${controls || "none"}`,
  ].join("\n");
};

export { MAX_ELEMENTS, toStepText, WALKTHROUGH_SYSTEM };

export type { StepPromptInput };
