const copy = {
  action: "Action",
  cancel: "Cancel",
  capture: "Press a key",
  capturing: "Press a key now. Esc cancels.",
  delay: "Delay in ms",
  delayUnit: "ms",
  key: "Key",
  pick: "Pick",
  pickHint: "Click the layer in the frame",
  pickTip: "Pick the target layer in the frame",
  target: "Target",
  targetHint: "#section",
  trigger: "Trigger",
  url: "URL",
  urlHint: "https://example.com",
  urlWrong: "Use a full URL that starts with https://.",
  visibility: "Show or hide",
} as const;

const VISIBILITY_LABELS = {
  hide: "Hide",
  show: "Show",
  toggle: "Toggle",
} as const;

export { VISIBILITY_LABELS, copy };
