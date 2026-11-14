const toCopiedText = (tag: string): string => {
  if (tag === "") {
    return "Style copied";
  }

  return `Copied style of ${tag}`;
};

const copy = {
  apply: "Paste",
  applying: "Pasting…",
  cancel: "Cancel",
  close: "Close",
  copied: toCopiedText,
  copy: "Copy style",
  failed: "Could not paste the style. Try again.",
  groupBorder: "Border",
  groupEffect: "Effects",
  groupFill: "Fill",
  groupLayout: "Layout",
  groupRadius: "Radius",
  groupSize: "Size",
  groupSpacing: "Padding and gap",
  groupText: "Text",
  groupsLabel: "Style groups to paste",
  needCopy: "Copy a style first",
  needSource: "Design Studio cannot find this layer in the code",
  otherProject: "The copied style is from another project or direction",
  paste: "Paste style",
  pasteSome: "Paste some…",
  pickTitle: "Paste some of the style",
  wait: "Wait for the last edit to finish",
} as const;

export { copy };
