import type { TweakControl, TweakValue } from "../../../shared/tweaks.js";

interface Group {
  readonly label: string;
  readonly controls: TweakControl[];
}

type EditFn = (control: TweakControl, value: TweakValue) => void;

const SUGGEST_BUSY_TIP = "Wait for the current run to finish";
const SUGGEST_TIP = "Ask the agent for tweak controls";
const MAX_PROBLEMS = 4;

const toGroupControls = (controls: TweakControl[]): Group[] => {
  const groups = new Map<string, TweakControl[]>();

  for (const control of controls) {
    const label = control.group ?? "General";
    groups.set(label, [...(groups.get(label) ?? []), control]);
  }

  return [...groups].map(([label, list]) => ({ controls: list, label }));
};

const toSlug = (value: string): string =>
  value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");

const toToggleText = (isOn: boolean): string => {
  if (isOn) {
    return "On";
  }

  return "Off";
};

const toReadout = (control: TweakControl, value: TweakValue): string => {
  if (control.type === "range") {
    return `${value}${control.unit ?? ""}`;
  }

  if (control.type === "toggle") {
    return toToggleText(value === true);
  }

  if (control.type === "select") {
    return (
      control.options.find((option) => option.value === value)?.label ??
      String(value)
    );
  }

  return String(value);
};

const toLabelFor = (control: TweakControl): string => {
  if (control.type === "color") {
    return "";
  }

  return `twk-${control.id}`;
};

const toChangedClass = (isChanged: boolean): string => {
  if (isChanged) {
    return "changed";
  }

  return "";
};

const toResetClass = (isChanged: boolean): string => {
  if (isChanged) {
    return "";
  }

  return "hidden";
};

const toSwitchClass = (isOn: boolean): string => {
  if (isOn) {
    return "twk-switch on";
  }

  return "twk-switch ";
};

const toChangeCount = (count: number): string => {
  if (count === 1) {
    return `${count} change`;
  }

  return `${count} changes`;
};

const toCommitLabel = (isCommitting: boolean): string => {
  if (isCommitting) {
    return "Saving…";
  }

  return "Save";
};

const toSuggestTip = (isRunning: boolean): string => {
  if (isRunning) {
    return SUGGEST_BUSY_TIP;
  }

  return SUGGEST_TIP;
};

const toProblemsHead = (count: number): string => {
  if (count === 1) {
    return "One control does not change the page yet";
  }

  return `${count} problems: some controls do not change the page yet`;
};

export {
  MAX_PROBLEMS,
  toChangeCount,
  toChangedClass,
  toCommitLabel,
  toGroupControls,
  toLabelFor,
  toProblemsHead,
  toReadout,
  toResetClass,
  toSlug,
  toSuggestTip,
  toSwitchClass,
};

export type { EditFn, Group };
