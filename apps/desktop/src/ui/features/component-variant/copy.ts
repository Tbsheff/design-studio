const copy = {
  applyToSelected: "Use on the selected layer",
  cancel: "Cancel",
  classes: "Classes",
  classesHint:
    "Tailwind classes, for example bg-primary text-primary-foreground",
  createTitle: "New variant",
  defaultMark: "default",
  draft: "Draft",
  draftNote:
    "The draft adds its classes on top of the start value. Classes that the app has not built yet show after save.",
  editTitle: "Edit variant",
  grid: "Values",
  name: "Name",
  nameHint: "Letters, digits, - and _",
  nameTaken: "This key already has a value with this name.",
  nameWrong: "Use a letter or digit first, then letters, digits, - or _.",
  noPreview: "No preview",
  notEditable:
    "These classes are not a plain string, so they are not edited here.",
  previewLoading: "Rendering…",
  save: "Save",
  saving: "Saving…",
  setDefault: "Set as default",
  startFrom: "Start from",
  suggestions: "Class suggestions",
  value: "Value",
} as const;

export { copy };
