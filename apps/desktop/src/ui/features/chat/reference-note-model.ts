interface ReferenceNote {
  readonly id: string;
  readonly label: string;
  readonly message: string | null;
  readonly state: "added" | "failed" | "importing";
}

const ID_RADIX = 36;

const ID_START = 2;

const toNoteId = (): string =>
  `${Date.now()}-${Math.random().toString(ID_RADIX).slice(ID_START)}`;

const toImportingNote = (name: string): ReferenceNote => ({
  id: toNoteId(),
  label: name,
  message: null,
  state: "importing",
});

const toSettledNote = (
  note: ReferenceNote,
  outcome: "added" | "failed",
  detail: string | null
): ReferenceNote => ({ ...note, message: detail, state: outcome });

const toFolderLabel = (folderPath: string): string => {
  const parts = folderPath.split("/").filter((part) => part !== "");

  return parts.at(-1) ?? folderPath;
};

export { toFolderLabel, toImportingNote, toSettledNote };

export type { ReferenceNote };
