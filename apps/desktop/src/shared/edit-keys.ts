type TypeProp = "font-size" | "letter-spacing" | "line-height";

type EditKey =
  | { readonly digit: string; readonly kind: "opacity" }
  | { readonly kind: "type"; readonly prop: TypeProp; readonly step: number };

interface EditKeyInput {
  readonly altKey: boolean;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly shiftKey: boolean;
}

const DIGIT_CODE = /^Digit(?<digit>\d)$/u;

const STEP_CODES = new Set(["Comma", "Period"]);

const TYPE_CHORDS = new Map<string, EditKey>([
  ["Mod+Shift+Period", { kind: "type", prop: "font-size", step: 1 }],
  ["Mod+Shift+Comma", { kind: "type", prop: "font-size", step: -1 }],
  ["Alt+Period", { kind: "type", prop: "letter-spacing", step: 1 }],
  ["Alt+Comma", { kind: "type", prop: "letter-spacing", step: -1 }],
  ["Alt+Shift+Period", { kind: "type", prop: "line-height", step: 1 }],
  ["Alt+Shift+Comma", { kind: "type", prop: "line-height", step: -1 }],
]);

const isPlainKey = (event: EditKeyInput): boolean =>
  !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;

const toDigitChord = (event: EditKeyInput): string | null => {
  if (!isPlainKey(event) || event.repeat || !DIGIT_CODE.test(event.code)) {
    return null;
  }

  return event.code;
};

const toModifierPrefix = (event: EditKeyInput): string | null => {
  const isMod = event.metaKey || event.ctrlKey;

  if (isMod && event.shiftKey && !event.altKey) {
    return "Mod+Shift+";
  }

  if (isMod || !event.altKey) {
    return null;
  }

  if (event.shiftKey) {
    return "Alt+Shift+";
  }

  return "Alt+";
};

const toTypeChord = (event: EditKeyInput): string | null => {
  if (!STEP_CODES.has(event.code)) {
    return null;
  }

  const prefix = toModifierPrefix(event);

  if (prefix === null) {
    return null;
  }

  return `${prefix}${event.code}`;
};

const toEditChord = (event: EditKeyInput): string | null =>
  toDigitChord(event) ?? toTypeChord(event);

const toEditKey = (chord: string | null): EditKey | null => {
  if (chord === null) {
    return null;
  }

  const digit = DIGIT_CODE.exec(chord)?.groups?.digit ?? null;

  if (digit !== null) {
    return { digit, kind: "opacity" };
  }

  return TYPE_CHORDS.get(chord) ?? null;
};

export { toEditChord, toEditKey };

export type { EditKey, EditKeyInput, TypeProp };
