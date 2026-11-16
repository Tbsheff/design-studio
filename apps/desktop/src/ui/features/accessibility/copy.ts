const copy = {
  aa: "AA",
  aaa: "AAA",
  alt: "Alt",
  altTip: "Alt text of the image. Screen readers read it out",
  ariaLabel: "Label",
  ariaLabelTip:
    "aria-label. Give it to an icon button or a control with no visible text",
  contrast: "Contrast",
  contrastFail: "Fails",
  contrastPass: "Passes",
  contrastTip: "WCAG contrast of the text and its background",
  decorative: "Decorative",
  decorativeTip: 'Marks the image as decorative with alt=""',
  fixDarkTip: "Set the dark value of this token in Tokens, or ask Claude.",
  fixLabel: (token: string): string =>
    `Use ${token} for the text color to pass AA`,
  fixText: (token: string): string => `Use ${token}`,
  name: "Name",
  nameFrom: (source: string): string => `from ${source}`,
  noName: "No accessible name",
  noSource:
    "Design Studio cannot find this layer in the code, so it cannot change accessibility.",
  noText: "No text on this layer to check.",
  ratio: (ratio: number, need: number): string =>
    `${ratio.toFixed(2)}:1 (needs ${need}:1)`,
  readerChecked: (isChecked: boolean): string => {
    if (isChecked) {
      return "checked";
    }

    return "not checked";
  },
  readerCount: (count: number): string => `${count} lines`,
  readerDisabled: "dimmed",
  readerEmpty: "The screen reader finds nothing to read in this frame.",
  readerExpanded: (isExpanded: boolean): string => {
    if (isExpanded) {
      return "expanded";
    }

    return "collapsed";
  },
  readerItem: "Reader",
  readerLevel: (role: string, level: number): string =>
    `${role} level ${level}`,
  readerList: "Screen reader lines",
  readerLoading: "Reading the frame…",
  readerMenu: "Accessibility overlay",
  readerMenuTip: "Show the tab order or the screen reader lines of the frame",
  readerNoName: "no name",
  readerNoNameTip: "No accessible name. A screen reader says only the role",
  readerNote:
    "Follows the browser accessibility tree. Not a real VoiceOver or NVDA run.",
  readerRowTip: "Hover to outline the layer. Click to select it",
  readerText: "Reader",
  readerTitle: "Screen reader",
  role: "Role",
  roleTip: "ARIA role of the layer",
  tabIndex: "Tab index",
  tabIndexTip: "0 puts the layer in the tab order. -1 takes it out",
  tabOrder: "Show tab order",
  tabOrderItem: "Tab order",
  tabOrderOff: "Hide tab order",
  tabOrderTip:
    "Shows the tab order of the frame with numbered badges. Red badges have no accessible name",
  tabStop: (order: number, name: string): string =>
    `Tab stop ${order}: ${name}`,
  tabStopUnnamed: (order: number): string => `Tab stop ${order}: unnamed`,
  tabText: "Tabs",
  theme: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  themeTip: "Check the light or the dark theme of the page",
  title: "Accessibility",
  unnamedMark: "!",
  unset: "Not set",
  visionChips: "Vision types",
  visionConfused: (
    kind: string,
    first: string,
    second: string,
    after: number
  ): string => `${kind}: ${first} and ${second} look alike (delta E ${after})`,
  visionKind: {
    achromatopsia: "Achromatopsia",
    "blurred-vision": "Blurred",
    deuteranopia: "Deuteranopia",
    protanopia: "Protanopia",
    "reduced-contrast": "Low contrast",
    tritanopia: "Tritanopia",
  },
  visionLost: (kind: string): string => `${kind}: text that fails`,
  visionNoFrame: "This design has no frame to simulate.",
  visionNothing: "No lost text pairs and no confused status colors.",
  visionRun: "Run",
  visionRunning: "Running…",
  visionSheet: "Simulation sheet: original and each vision type",
  visionTip:
    "Shows the frame as users with color blindness or low vision see it",
  visionTitle: "Simulate vision",
} as const;

export { copy };
