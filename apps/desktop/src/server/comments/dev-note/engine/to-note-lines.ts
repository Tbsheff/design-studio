import type { DevNoteSchema } from "@design-studio/actions/dev-note/schema";

type Note = typeof DevNoteSchema.Type;

type Measurements = NonNullable<Note["measurements"]>;

type Measured = Measurements["background"];

interface FrameLabel {
  readonly id: string;
  readonly label: string | null;
}

const toOneLine = (value: string): string =>
  value.replaceAll(/\s+/gu, " ").trim();

const toTokenText = (measured: Measured): string => {
  if (measured.token === null) {
    return `\`${measured.value}\``;
  }

  return `\`${measured.value}\` (\`${measured.token}\`)`;
};

const toPaddingText = (padding: Measurements["padding"]): string =>
  [padding.top, padding.right, padding.bottom, padding.left]
    .map((side) => toTokenText(side))
    .join(" ");

const toMeasureLines = (measured: Measurements): string[] => [
  `  - Box: ${measured.box.width} x ${measured.box.height} px at ${measured.box.x}, ${measured.box.y}`,
  `  - Padding (top right bottom left): ${toPaddingText(measured.padding)}`,
  `  - Gap: ${toTokenText(measured.gap)}`,
  `  - Radius: ${toTokenText(measured.radius)}`,
  `  - Font: ${measured.font.family}, size ${toTokenText(measured.font.size)}, weight ${measured.font.weight}, line height ${measured.font.lineHeight}`,
  `  - Color: ${toTokenText(measured.color)}`,
  `  - Background: ${toTokenText(measured.background)}`,
];

const toNoteBlock = (note: Note): string[] => {
  let where = "";

  if (note.source !== null) {
    where = ` at \`source/${note.source}\``;
  }

  const head = `- #${note.number} (${note.kind})${where}: ${toOneLine(note.text)}`;

  if (note.measurements === null) {
    return [head];
  }

  return [head, ...toMeasureLines(note.measurements)];
};

const toFrameName = (
  frameId: string,
  frames: readonly FrameLabel[]
): string => {
  const label = frames.find((frame) => frame.id === frameId)?.label ?? null;

  if (label === null || label === "") {
    return `Frame ${frameId}`;
  }

  return `Frame ${frameId} (${toOneLine(label)})`;
};

const toFrameLines = (
  frameId: string,
  notes: readonly Note[],
  frames: readonly FrameLabel[]
): string[] => {
  const own = notes
    .filter((note) => note.frameId === frameId)
    .toSorted((left, right) => left.number - right.number);

  const lines = [`### ${toFrameName(frameId, frames)}`, ""];

  for (const note of own) {
    lines.push(...toNoteBlock(note));
  }

  lines.push("");

  return lines;
};

const toNoteLines = (
  notes: readonly Note[],
  frames: readonly FrameLabel[]
): string[] => {
  if (notes.length === 0) {
    return ["No dev notes.", ""];
  }

  const ids = [...new Set(notes.map((note) => note.frameId))];

  return [
    "Build to these notes. Each note lists the measured values, with the token name when one matches.",
    "",
    ...ids.flatMap((frameId) => toFrameLines(frameId, notes, frames)),
  ];
};

export { toNoteLines };
