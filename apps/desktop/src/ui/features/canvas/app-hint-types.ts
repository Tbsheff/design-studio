const HINT_KINDS = ["failed", "starting", "loading", "route"] as const;

type HintKind = (typeof HINT_KINDS)[number];

interface Hint {
  text: string;
  busy: boolean;
  kind: HintKind;
}

export { HINT_KINDS };

export type { Hint, HintKind };
