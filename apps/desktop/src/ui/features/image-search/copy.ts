const copy = {
  author: "Photo by",
  close: "Close",
  credit: "Credit added to ASSETS.md",
  empty: "No photo matches this search.",
  failed: "Could not search photos. Try again.",
  find: "Find photo",
  findMenu: "Find photo…",
  grid: "Photos",
  hint: "Free photos with Creative Commons licenses from Openverse. Click a photo to place it.",
  insertHint: "The photo goes inside the selected layer as a new image.",
  loading: "Searching…",
  needSelection: "Select a layer first",
  noSource: "Design Studio cannot find this layer in the code",
  offBody:
    "Image search is off. When it is on, the studio sends only your search words to Openverse.",
  offEnv: "STUDIO_IMAGE_SEARCH=on also turns it on for all projects.",
  offSwitch: "Turn on image search for this project",
  orientation: "Orientation",
  placed: "Photo placed",
  placing: "Placing…",
  replaceHint: "The photo replaces the selected image.",
  search: "Search photos",
  searchPlaceholder: "yoga studio",
  setting: "Image search for this project",
  settingFailed: "Could not change the setting. Try again.",
  submit: "Search",
  unknownAuthor: "Unknown author",
  wait: "Wait for the last edit to finish",
} as const;

const ORIENTATION_LABEL = {
  any: "Any",
  square: "Square",
  tall: "Tall",
  wide: "Wide",
} as const;

const EDIT_GROUP = "Edit";

const FIND_PHOTO_COMMAND = "image.find";

export { copy, EDIT_GROUP, FIND_PHOTO_COMMAND, ORIENTATION_LABEL };
