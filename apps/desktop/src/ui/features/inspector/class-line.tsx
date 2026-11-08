import type { TailwindOutcome } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";

interface Props {
  readonly info: TailwindOutcome | null;
  readonly resolved: string[];
}

const NO_CLASSES_TEXT = "No classes yet";

const toClassList = (
  own: boolean,
  info: TailwindOutcome,
  resolved: string[]
): string[] => {
  if (own) {
    return info.classes;
  }

  return resolved;
};

const toListText = (list: readonly string[]): string => {
  if (list.length > 0) {
    return list.join(" ");
  }

  return NO_CLASSES_TEXT;
};

const toListClass = (own: boolean): string => {
  if (own) {
    return "ins-classes-list";
  }

  return "ins-classes-list resolved";
};

const toListLabel = (own: boolean): string => {
  if (own) {
    return "Tailwind classes";
  }

  return "Classes from the component, read only";
};

const toTagAside = (own: boolean, count: number): ReactNode => {
  if (!own && count > 0) {
    return <span className="ins-classes-tag">{copy.readOnly}</span>;
  }

  return null;
};

const ClassLine = ({ info, resolved }: Props): ReactElement | null => {
  if (!info || info.mode === "none") {
    return null;
  }

  const own = info.classes.length > 0;
  const list = toClassList(own, info, resolved);

  return (
    <InspectorSection
      title={copy.classes}
      modifier="ins-classes"
      aside={toTagAside(own, list.length)}
    >
      <code className={toListClass(own)} data-tip={toListLabel(own)}>
        {toListText(list)}
        {info.dynamic && (
          <span className="ins-classes-more"> {copy.dynamic}</span>
        )}
      </code>
      {info.note && <p className="ins-note ins-classes-note">{info.note}</p>}
    </InspectorSection>
  );
};

export { ClassLine };
