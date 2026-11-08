import type { DevNoteSchema } from "@design-studio/actions/dev-note/schema";

import type { Measurements } from "../dev-note-measure.js";

type DevNoteRecord = typeof DevNoteSchema.Type;

interface NewNote {
  readonly frameId: string;
  readonly id: string;
  readonly kind: DevNoteRecord["kind"];
  readonly layerId: string | null;
  readonly measured: MeasuredNote | null;
  readonly number: number;
  readonly now: number;
  readonly targetSource: string | null;
  readonly text: string;
}

interface MeasuredNote {
  readonly measurements: Measurements;
  readonly source: string | null;
}

interface NoteChange {
  readonly kind: DevNoteRecord["kind"] | null;
  readonly measured: MeasuredNote | null;
  readonly now: number;
  readonly text: string | null;
}

const toNewRecord = (note: NewNote): DevNoteRecord => ({
  createdAt: note.now,
  frameId: note.frameId,
  id: note.id,
  kind: note.kind,
  layerId: note.layerId,
  measurements: note.measured?.measurements ?? null,
  number: note.number,
  source: note.measured?.source ?? note.targetSource,
  text: note.text,
  updatedAt: note.now,
});

const toUpdatedRecord = (
  latest: DevNoteRecord,
  change: NoteChange
): DevNoteRecord => ({
  ...latest,
  kind: change.kind ?? latest.kind,
  measurements: change.measured?.measurements ?? latest.measurements,
  source: change.measured?.source ?? latest.source,
  text: change.text ?? latest.text,
  updatedAt: change.now,
});

export { toNewRecord, toUpdatedRecord };

export type { DevNoteRecord, MeasuredNote, NewNote, NoteChange };
