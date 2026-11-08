import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent } from "react";

import type { DevNote, NoteKind } from "./dev-note-model.js";
import { useCreateDevNote } from "./use-create-dev-note.js";

interface NoteFormTarget {
  readonly frameId: string;
  readonly layerId: string | null;
  readonly projectId: string;
  readonly source: string | null;
}

interface NoteForm {
  readonly error: Error | null;
  readonly handleKind: (kind: NoteKind) => void;
  readonly handleSave: () => void;
  readonly handleText: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleToggle: () => void;
  readonly isMeasured: boolean;
  readonly isPending: boolean;
  readonly kind: NoteKind;
  readonly saved: DevNote | null;
  readonly text: string;
}

const useNoteForm = (target: NoteFormTarget): NoteForm => {
  const [noteKind, setNoteKind] = useState<NoteKind>("spec");
  const [noteText, setNoteText] = useState("");
  const [isNoteMeasured, setIsNoteMeasured] = useState(false);
  const [savedNote, setSavedNote] = useState<DevNote | null>(null);
  const [isSaving, startWork] = useTransition();
  const { error: createError, run } = useCreateDevNote();

  const changeText = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(event.target.value);
  }, []);

  const flipMeasured = useCallback(() => {
    setIsNoteMeasured((current) => !current);
  }, []);

  const saveNote = useCallback((): void => {
    startWork(async () => {
      const result = await run({
        frameId: target.frameId,
        isMeasured: isNoteMeasured,
        kind: noteKind,
        layerId: target.layerId,
        projectId: target.projectId,
        targetSource: target.source,
        text: noteText.trim(),
      });

      setSavedNote(result);
    });
  }, [isNoteMeasured, noteKind, noteText, run, target]);

  return {
    error: createError,
    handleKind: setNoteKind,
    handleSave: saveNote,
    handleText: changeText,
    handleToggle: flipMeasured,
    isMeasured: isNoteMeasured,
    isPending: isSaving,
    kind: noteKind,
    saved: savedNote,
    text: noteText,
  };
};

export { useNoteForm };

export type { NoteForm, NoteFormTarget };
