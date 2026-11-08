const NAME_MAX = 80;
const COPY_SUFFIX = " copy";

const toCopyName = (defaultName: string): string =>
  `${defaultName.slice(0, NAME_MAX - COPY_SUFFIX.length)}${COPY_SUFFIX}`;

const toUpdateText = (isUpdating: boolean, defaultName: string): string => {
  if (isUpdating) {
    return `Updates ${defaultName} in your library with this direction's tokens and DESIGN.md.`;
  }

  return "Saves this direction's tokens and DESIGN.md as a design system you can use in other projects.";
};

const toSaveText = (
  isNew: boolean,
  isUpdating: boolean,
  defaultName: string
): string => {
  if (isNew) {
    return "Saves a new design system. This project then uses the new one.";
  }

  return toUpdateText(isUpdating, defaultName);
};

const toSaveLabel = (isBusy: boolean): string => {
  if (isBusy) {
    return "Saving…";
  }

  return "Save";
};

export { toCopyName, toSaveLabel, toSaveText };
