import type { BridgeToParent, MatchKind } from "@design-studio/contracts";

interface MatchOption {
  readonly by: MatchKind;
  readonly label: string;
  readonly tip: string;
}

const MATCH_OPTIONS: readonly MatchOption[] = [
  {
    by: "component",
    label: "Component",
    tip: "Select every copy of this component or element",
  },
  {
    by: "classes",
    label: "Classes",
    tip: "Select elements with exactly the same classes",
  },
  {
    by: "text-style",
    label: "Text style",
    tip: "Select text with the same font, size, weight, line height and tracking",
  },
];

const MATCH_WAIT_MS = 5000;

const MATCH_NOTE_MS = 6000;

const toMatchedText = (
  message: Extract<BridgeToParent, { readonly type: "matched" }>
): string => {
  if (message.note) {
    return message.note;
  }

  if (message.count <= 1) {
    return "No other element matches.";
  }

  return `Selected ${message.count} matching elements.`;
};

export { MATCH_NOTE_MS, MATCH_OPTIONS, MATCH_WAIT_MS, toMatchedText };

export type { MatchOption };
