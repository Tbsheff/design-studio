const copy = {
  badge: "Findings in this cell",
  check: "Check",
  checking: "Checking",
  clean: "No findings in any cell",
  create: "Create",
  creating: "Creating",
  failed: "Could not run the matrix",
  findings: "Findings",
  fix: {
    action: "Fix findings",
    applied: "Saved as one version. Press Cmd+Z to undo.",
    apply: "Apply",
    edits: "Planned edits",
    empty: "Nothing to fix at these widths",
    scope: "Fixes run for widths up to 768 and change only those widths.",
    skipped: "Skipped",
  },
  jump: "Show cell",
  menuLabel: "Viewport matrix",
  menuTip: "Check one page at several widths in light and dark",
  scheme: { both: "Both", dark: "Dark", light: "Light" },
  schemeLabel: "Scheme",
  sheet: "Contact sheet",
  title: "Matrix",
  widthLabel: "Widths",
} as const;

export { copy };
