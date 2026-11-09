const PROJECT_RENAME_EVENT = "studio:project-rename";

const requestProjectRename = (): void => {
  globalThis.dispatchEvent(new Event(PROJECT_RENAME_EVENT));
};

export { PROJECT_RENAME_EVENT, requestProjectRename };
