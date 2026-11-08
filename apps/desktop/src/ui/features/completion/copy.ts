const copy = {
  capLabel: "Monthly cap (USD)",
  capNote: "Calls stop when the month total reaches the cap.",
  empty:
    "No calls yet. Prototype pages call Claude with window.studio.complete().",
  failed: "Could not save. Try again.",
  frameNone: "No page",
  logTitle: "Recent calls",
  noProject: "Open a project to set up Prototype AI.",
  off: "Off",
  offNote:
    "Prototype pages cannot call Claude. Calls fail until you turn this on.",
  on: "On",
  onNote:
    "Prototype pages can call Claude with window.studio.complete(). Each call costs money.",
  spent: "Spent this month",
  switchLabel: "Prototype AI",
  title: "Prototype AI",
} as const;

export { copy };
