import { isGroupStateName } from "@design-studio/contracts/state-styles";
import type { GroupStateName } from "@design-studio/contracts/state-styles";

const GROUP_DATA_VALUES: Readonly<Record<GroupStateName, string | null>> = {
  "group-checked": "checked",
  "group-hover": null,
  "group-open": "open",
};

const UNNAMED_GROUP = /(?:^|:)group-(?:hover|data-\[[^\]]*\]):/u;

const NAMED_GROUP = /(?:^|:)group-(?:hover|data-\[[^\]]*\])\/(?<name>[\w-]+):/u;

const toGroupDataValue = (state: GroupStateName): string | null =>
  GROUP_DATA_VALUES[state];

const toGroupState = (states: readonly string[]): GroupStateName | null =>
  states.find((state) => isGroupStateName(state)) ?? null;

const toClassList = (element: Element): string[] => [...element.classList];

const toGroupName = (element: Element): string | null => {
  for (const token of toClassList(element)) {
    const name = NAMED_GROUP.exec(token)?.groups?.["name"] ?? "";

    if (name !== "") {
      return name;
    }
  }

  return null;
};

const hasUnnamedGroup = (element: Element): boolean =>
  toClassList(element).some((token) => UNNAMED_GROUP.test(token));

const isGroupElement = (element: Element): boolean =>
  toClassList(element).some(
    (token) => token === "group" || token.startsWith("group/")
  );

const toNearestGroup = (start: Element): Element | null => {
  for (
    let current: Element | null = start;
    current !== null;
    current = current.parentElement
  ) {
    if (isGroupElement(current)) {
      return current;
    }
  }

  return null;
};

const toGroupElement = (element: Element | null): Element | null => {
  const parent = element?.parentElement ?? null;

  if (element === null || parent === null) {
    return null;
  }

  const name = toGroupName(element);

  if (name !== null) {
    const groupClass = CSS.escape(`group/${name}`);

    return parent.closest(`.${groupClass}`);
  }

  if (hasUnnamedGroup(element)) {
    return parent.closest(".group");
  }

  return toNearestGroup(parent);
};

export { toGroupDataValue, toGroupElement, toGroupState };
