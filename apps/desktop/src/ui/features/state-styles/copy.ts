const copy = {
  chipTip: {
    active:
      "Pressed state. The frame shows the element as if pressed. Edits write active: styles",
    dark: "Dark theme. The frame shows the dark theme. Edits write dark: styles",
    default: "Default state. Edits change the normal styles",
    disabled:
      "Disabled state. The frame shows the element as disabled. Edits write disabled: styles",
    "focus-visible":
      "Focus state. The frame shows the element as if focused with the keyboard. Edits write focus-visible: styles",
    hover:
      "Hover state. The frame shows the element as if hovered. Edits write hover: styles",
  },
  groupLabel: "Element state",
  hasStyles: "Has styles in this state",
  label: {
    active: "Pressed",
    dark: "Dark",
    default: "Default",
    disabled: "Disabled",
    "focus-visible": "Focus",
    hover: "Hover",
  },
  stateNote: "Edits go to this state. Press Esc for Default.",
} as const;

export { copy };
