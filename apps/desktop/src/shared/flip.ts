type FlipAxis = "x" | "y";

interface FlipKeyInput {
  readonly altKey: boolean;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly shiftKey: boolean;
}

const FLIP_CHORDS = new Map<string, FlipAxis>([
  ["Shift+KeyH", "x"],
  ["Shift+KeyV", "y"],
]);

const toFlipChord = (event: FlipKeyInput): string | null => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return null;
  }

  if (!event.shiftKey) {
    return null;
  }

  const chord = `Shift+${event.code}`;

  if (FLIP_CHORDS.has(chord)) {
    return chord;
  }

  return null;
};

const toFlipAxis = (chord: string | null): FlipAxis | null => {
  if (chord === null) {
    return null;
  }

  return FLIP_CHORDS.get(chord) ?? null;
};

export { toFlipAxis, toFlipChord };

export type { FlipAxis, FlipKeyInput };
