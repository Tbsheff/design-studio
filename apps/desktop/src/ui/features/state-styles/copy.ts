const dataStates = {
  chipTip: {
    "active-item":
      "Active item state. The frame sets data-active to true on the layer, as sidebar items do. Edits write data-[active=true]: styles",
    closed:
      "Closed state. The frame sets data-state to closed on the layer. Edits write data-[state=closed]: styles",
    invalid:
      "Invalid state. The frame sets aria-invalid to true on the layer. Edits write aria-invalid: styles",
    on: "On state. The frame sets data-state to on on the layer, as toggles do. Edits write data-[state=on]: styles",
  },
  label: {
    "active-item": "Active item",
    closed: "Closed",
    invalid: "Invalid",
    on: "On",
  },
  otherTip: "Other state prefix on this layer. Read only: edit it in the code",
} as const;

const copy = {
  chipTip: {
    ...dataStates.chipTip,
    active:
      "Pressed state. The frame shows the layer as if pressed. Edits write active: styles",
    checked:
      "Checked state. The frame sets data-state to checked on the layer. Edits write data-[state=checked]: styles",
    dark: "Dark theme. The frame shows the dark theme. Edits write dark: styles",
    default: "Default state. Edits change the normal styles",
    disabled:
      "Disabled state. The frame shows the layer as disabled. Edits write disabled: styles, or data-[disabled]: when the layer has them",
    even: "Even items. The frame outlines the even items. Edits write even: styles",
    first:
      "First item. The frame outlines the first item. Edits write first: styles",
    "focus-visible":
      "Focus state. The frame shows the layer as if focused with the keyboard. Edits write focus-visible: styles",
    "group-checked":
      "Parent checked state. The frame sets data-state to checked on the parent with the group class. Edits write group-data-[state=checked]: styles",
    "group-hover":
      "Parent hover state. The frame shows the parent with the group class as if hovered. Edits write group-hover: styles",
    "group-open":
      "Parent open state. The frame sets data-state to open on the parent with the group class. Edits write group-data-[state=open]: styles",
    hover:
      "Hover state. The frame shows the layer as if hovered. Edits write hover: styles",
    last: "Last item. The frame outlines the last item. Edits write last: styles",
    odd: "Odd items. The frame outlines the odd items. Edits write odd: styles",
    open: "Open state. The frame sets data-state to open on the layer. Edits write data-[state=open]: styles",
    selected:
      "Selected state. The frame sets data-state to active on the layer, as Radix Tabs do. Edits write data-[state=active]: styles",
  },
  edge: {
    list: {
      even: "Styles the even items in this list.",
      first: "Styles the first item in this list.",
      last: "Styles the last item in this list.",
      odd: "Styles the odd items in this list.",
    },
    siblings: {
      even: "Styles this layer when it is an even item.",
      first: "Styles this layer when it is the first item.",
      last: "Styles this layer when it is the last item.",
      odd: "Styles this layer when it is an odd item.",
    },
  },
  groupLabel: "Layer state",
  label: {
    ...dataStates.label,
    active: "Pressed",
    checked: "Checked",
    dark: "Dark",
    default: "Default",
    disabled: "Disabled",
    even: "Even",
    first: "First",
    "focus-visible": "Focus",
    "group-checked": "Parent checked",
    "group-hover": "Parent hover",
    "group-open": "Parent open",
    hover: "Hover",
    last: "Last",
    odd: "Odd",
    open: "Open",
    selected: "Selected",
  },
  menuTip:
    "State to edit. The frame shows the layer in this state. Press Esc for Default",
  otherTip: dataStates.otherTip,
} as const;

export { copy };
