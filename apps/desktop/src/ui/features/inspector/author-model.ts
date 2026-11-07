type SheetMode = "create" | "edit";

const AUTHOR_OPTIONS = [
  { label: "New variant…", value: ":new" },
  { label: "Edit variant…", value: ":edit" },
];

const toAuthorMode = (value: string): SheetMode | null => {
  if (value === ":new") {
    return "create";
  }

  if (value === ":edit") {
    return "edit";
  }

  return null;
};

export { AUTHOR_OPTIONS, toAuthorMode };

export type { SheetMode };
