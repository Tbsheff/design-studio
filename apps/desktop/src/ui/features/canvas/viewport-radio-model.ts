const toRadioClass = (isOn: boolean, isDisabled: boolean): string => {
  const names = ["seg-radio"];

  if (isOn) {
    names.push("on");
  }

  if (isDisabled) {
    names.push("disabled");
  }

  return names.join(" ");
};

const toTipAlign = (
  align: "start" | "end" | null
): "start" | "end" | undefined => {
  if (align) {
    return align;
  }
};

export { toRadioClass, toTipAlign };
