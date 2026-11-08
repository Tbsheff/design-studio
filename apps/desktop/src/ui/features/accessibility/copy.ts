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
  fixLabel: (token: string): string =>
    `Use ${token} for the text color to pass AA`,
  fixText: (token: string): string => `Use ${token}`,
  name: "Name",
  nameFrom: (source: string): string => `from ${source}`,
  noName: "No accessible name",
  noSource:
    "This layer has no source location, so it takes no accessibility edit.",
  noText: "No text on this layer to check.",
  ratio: (ratio: number, need: number): string =>
    `${ratio.toFixed(2)}:1 (needs ${need}:1)`,
  role: "Role",
  roleTip: "ARIA role of the layer",
  tabIndex: "Tab index",
  tabIndexTip: "0 puts the layer in the tab order. -1 takes it out",
  tabOrder: "Show tab order",
  tabOrderOff: "Hide tab order",
  tabOrderTip:
    "Shows the tab order of the frame with numbered badges. Red badges have no accessible name",
  tabStop: (order: number, name: string): string =>
    `Tab stop ${order}: ${name}`,
  tabStopUnnamed: (order: number): string => `Tab stop ${order}: unnamed`,
  tabText: "Tabs",
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
  visionNoFrame: "This direction has no frame to simulate.",
  visionNothing: "No lost text pairs and no confused status colors.",
  visionRun: "Run",
  visionRunning: "Running",
  visionSheet: "Simulation sheet: original and each vision type",
  visionTip:
    "Shows the frame as users with color blindness or low vision see it",
  visionTitle: "Simulate vision",
} as const;

export { copy };
