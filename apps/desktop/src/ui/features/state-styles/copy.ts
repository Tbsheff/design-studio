const copy = {
  chipTip: {
    active:
      "Pressed state. The frame shows the layer as if pressed. Edits write active: styles",
    checked:
      "Checked state. The frame sets data-state to checked on the layer. Edits write data-[state=checked]: styles",
    dark: "Dark theme. The frame shows the dark theme. Edits write dark: styles",
    default: "Default state. Edits change the normal styles",
    disabled:
      "Disabled state. The frame shows the layer as disabled. Edits write disabled: styles",
    "focus-visible":
      "Focus state. The frame shows the layer as if focused with the keyboard. Edits write focus-visible: styles",
    hover:
      "Hover state. The frame shows the layer as if hovered. Edits write hover: styles",
    open: "Open state. The frame sets data-state to open on the layer. Edits write data-[state=open]: styles",
    selected:
      "Selected state. The frame sets data-state to active on the layer, as Radix Tabs do. Edits write data-[state=active]: styles",
  },
  groupLabel: "Layer state",
  hasStyles: "Has styles in this state",
  label: {
    active: "Pressed",
    checked: "Checked",
    dark: "Dark",
    default: "Default",
    disabled: "Disabled",
    "focus-visible": "Focus",
    hover: "Hover",
    open: "Open",
    selected: "Selected",
  },
  stateNote: "Edits go to this state. Press Esc for Default.",
} as const;

export { copy };
