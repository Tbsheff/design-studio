const MOD_LABEL =
  (typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/u.test(navigator.platform) &&
    "⌘") ||
  "Ctrl+";

export { MOD_LABEL };
