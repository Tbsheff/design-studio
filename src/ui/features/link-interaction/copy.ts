const copy = {
  action: "Action",
  cancel: "Cancel",
  capture: "Press a key",
  capturing: "Press a key now. Esc cancels.",
  delay: "Delay in ms",
  delayUnit: "ms",
  key: "Key",
  pick: "Pick",
  pickHint: "Click the element in the frame",
  pickTip: "Pick the target element in the frame",
  target: "Target selector",
  targetHint: "#section",
  trigger: "Trigger",
  url: "URL",
  urlHint: "https://example.com",
  urlWrong: "Use a full https URL.",
  visibility: "Show or hide",
} as const;

const VISIBILITY_LABELS = {
  hide: "Hide",
  show: "Show",
  toggle: "Toggle",
} as const;

export { VISIBILITY_LABELS, copy };
