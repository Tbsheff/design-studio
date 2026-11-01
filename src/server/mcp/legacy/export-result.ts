interface HandoffView {
  files: number;
  prompt: string;
}

interface FileOutput {
  bytes: Uint8Array;
  note?: string | null;
}

interface NoteField {
  note?: string;
}

interface HandoffResult {
  files: string[];
  handoffFiles: number;
  prompt: string;
  versionId: string;
}

interface FileResult extends NoteField {
  bytes: number;
  files: string[];
  versionId: string;
}

const noteField = (note: string | null | undefined): NoteField => {
  if (note) {
    return { note };
  }

  return {};
};

const handoffResult = (
  file: string,
  version: string,
  handoff: HandoffView
): HandoffResult => ({
  files: [file],
  versionId: version,
  handoffFiles: handoff.files,
  prompt: handoff.prompt,
});

const fileResult = (
  file: string,
  version: string,
  output: FileOutput
): FileResult => ({
  files: [file],
  versionId: version,
  bytes: output.bytes.byteLength,
  ...noteField(output.note),
});

export { fileResult, handoffResult };
