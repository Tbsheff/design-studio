const copy = {
  inset: "Offsets",
  noSource:
    "Design Studio cannot find this layer in the code, so it cannot change position and stacking.",
  position: "Position",
  positionLabel: {
    absolute: "Absolute",
    fixed: "Fixed",
    relative: "Relative",
    static: "Static",
    sticky: "Sticky",
  },
  positionTip:
    "Sticky stays in the scroll area at its offset. Fixed stays in the viewport. Absolute sits at its offset in the nearest positioned parent",
  saving: "Saving…",
  side: {
    bottom: "Bottom",
    left: "Left",
    right: "Right",
    top: "Top",
  },
  sideTip:
    "A spacing key (0, 4, px) or a CSS length (16px). Clear it to remove the offset",
  title: "Position and stacking",
  unset: "Not set",
  zIndex: "Z-index",
  zStop: {
    back: "Already at the back",
    front: "Already in front",
    "no-overlap-back":
      "No layer overlaps this one. Use Alt+↓ to move it in the list.",
    "no-overlap-backward":
      "No layer overlaps this one. Use Alt+↓ to move it in the list.",
    "no-overlap-forward":
      "No layer overlaps this one. Use Alt+↑ to move it in the list.",
    "no-overlap-front":
      "No layer overlaps this one. Use Alt+↑ to move it in the list.",
    "no-read":
      "Design Studio cannot read the layers around this one. Try again.",
    "no-source":
      "Design Studio cannot find the overlapping layer in the code, so it cannot change the order.",
    wait: "Wait for the last edit to finish",
  },
  zTip: "Snaps to the scale 0, 10, 20, 30, 40, 50 or auto. A project token like --z-header stays as it is",
  zTooMany: {
    back: "Select 20 layers or fewer to send them to back.",
    front: "Select 20 layers or fewer to bring them to front.",
  },
} as const;

export { copy };
