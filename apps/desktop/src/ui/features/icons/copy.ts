const copy = {
  cancel: "Cancel",
  color: "Color token",
  colorHelp: "Leave empty to use the text color.",
  colorPlaceholder: "currentColor",
  colorProblem: "Use a token name such as primary or muted-foreground",
  empty: "No icon matches this search.",
  failed: "Could not load icons. Try again.",
  grid: "Icons",
  insert: "Insert icon",
  insertBusy: "Inserting…",
  insertMenu: "Insert icon…",
  loading: "Loading icons…",
  needSelection: "Select a layer first",
  noSource: "Design Studio cannot find this layer in the code",
  search: "Search icons",
  searchHint: "Type to search. Arrow keys move, Enter inserts.",
  size: "Size (px)",
  swap: "Swap icon",
  swapBusy: "Swapping…",
  swapMenu: "Swap icon…",
  wait: "Wait for the last edit to finish",
} as const;

const COLOR_TOKENS = [
  "foreground",
  "muted-foreground",
  "primary",
  "secondary",
  "accent",
  "destructive",
] as const;

const EDIT_GROUP = "Edit";
const INSERT_ICON_COMMAND = "icon.insert";
const SWAP_ICON_COMMAND = "icon.swap";

export {
  COLOR_TOKENS,
  copy,
  EDIT_GROUP,
  INSERT_ICON_COMMAND,
  SWAP_ICON_COMMAND,
};
