import { toMockPick, toStepText } from "./engine/index.js";
import type { StepChoice } from "./engine/index.js";
import { runWalkthroughModel } from "./walkthrough-model.js";
import { toStepChoice } from "./walkthrough-reply.js";
import type { PickInput, PickStep } from "./walkthrough-walk.js";

const MAX_TRIES = 2;

const toBadReplyChoice = (): StepChoice => ({
  action: "stuck",
  element: null,
  friction: null,
  reason: "The model reply was not a valid choice.",
  text: null,
});

const toChoice = async (
  input: PickInput,
  tries: number
): Promise<StepChoice> => {
  if (tries <= 0) {
    return toBadReplyChoice();
  }

  const answer = await runWalkthroughModel(
    input.shotFile,
    toStepText({
      elements: input.elements,
      history: input.history,
      index: input.index,
      maxSteps: input.maxSteps,
      persona: input.persona,
      task: input.task,
      url: input.url,
    })
  );

  const choice = toStepChoice(answer.text, input.elements);

  if (choice !== null) {
    return choice;
  }

  return toChoice(input, tries - 1);
};

const toModelPicker = (): PickStep => (input) => toChoice(input, MAX_TRIES);

const toMockPicker = (): PickStep => (input) =>
  Promise.resolve(
    toMockPick({
      clicked: input.clicked,
      elements: input.elements,
      hasActed: input.history.some(
        (step) => step.action === "click" || step.action === "type"
      ),
      task: input.task,
    })
  );

export { toMockPicker, toModelPicker };
