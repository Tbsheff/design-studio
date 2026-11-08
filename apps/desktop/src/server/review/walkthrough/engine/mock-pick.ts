import type { PageElement, StepChoice } from "./page-element.js";

interface MockPickInput {
  readonly clicked: ReadonlySet<string>;
  readonly elements: readonly PageElement[];
  readonly hasActed: boolean;
  readonly task: string;
}

const MIN_WORD = 4;

const STOP_WORDS: ReadonlySet<string> = new Set([
  "from",
  "have",
  "into",
  "that",
  "then",
  "them",
  "this",
  "will",
  "with",
  "your",
]);

const SAMPLE_EMAIL = "alex@example.com";

const SAMPLE_TEXT = "Sample text";

const toWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((word) => word.length >= MIN_WORD && !STOP_WORDS.has(word));

const toElementKey = (element: PageElement): string =>
  `${element.selector}|${element.name}`;

const isMatch = (element: PageElement, words: ReadonlySet<string>): boolean =>
  toWords(element.name).some((word) => words.has(word));

const toTypedText = (element: PageElement): string => {
  if (/mail/iu.test(element.name)) {
    return SAMPLE_EMAIL;
  }

  return SAMPLE_TEXT;
};

const toMockPick = (input: MockPickInput): StepChoice => {
  const words = new Set(toWords(input.task));

  const found =
    input.elements.find(
      (element) =>
        element.hasName &&
        !input.clicked.has(toElementKey(element)) &&
        isMatch(element, words)
    ) ?? null;

  if (found === null && input.hasActed) {
    return {
      action: "done",
      element: null,
      friction: null,
      reason: "No control is left that matches the task. The task looks done.",
      text: null,
    };
  }

  if (found === null) {
    return {
      action: "stuck",
      element: null,
      friction: {
        fix: "Add a visible control with a name that says the task, such as a link or button.",
        severity: "high",
        text: "No control on this screen matches the task words.",
      },
      reason: "No control matches the task words.",
      text: null,
    };
  }

  if (found.isField) {
    return {
      action: "type",
      element: found,
      friction: null,
      reason: `Type into ${found.name} because it matches the task.`,
      text: toTypedText(found),
    };
  }

  return {
    action: "click",
    element: found,
    friction: null,
    reason: `Click ${found.name} because it matches the task.`,
    text: null,
  };
};

export { toElementKey, toMockPick };

export type { MockPickInput };
