const copy = {
  action: "Action",
  cancel: "Cancel",
  capture: "Press a key",
  capturing: "Press a key now. Esc cancels.",
  delay: "Delay in ms",
  delayUnit: "ms",
  key: "Key",
  onlyWhen: "Only when",
  operation: "Operation",
  pick: "Pick",
  pickHint: "Click the layer in the frame",
  pickTip: "Pick the target layer in the frame",
  target: "Target",
  targetHint: "#section",
  trigger: "Trigger",
  url: "URL",
  urlHint: "https://example.com",
  urlWrong: "Use a full URL that starts with https://.",
  variableName: "Variable name",
  variableNameHint: "signedIn",
  variableValue: "Value",
  variableValueHint: "true",
  visibility: "Show or hide",
  whenEquals: "Equals",
  whenEqualsSign: "=",
  whenName: "Variable",
} as const;

const VARIABLE_OP_LABELS = {
  add: "Add",
  set: "Set to",
  toggle: "Toggle",
} as const;

const VISIBILITY_LABELS = {
  hide: "Hide",
  show: "Show",
  toggle: "Toggle",
} as const;

export { VARIABLE_OP_LABELS, VISIBILITY_LABELS, copy };
