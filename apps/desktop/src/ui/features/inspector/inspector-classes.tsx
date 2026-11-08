import type { TailwindOutcome } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";

const domClasses = (outerHTML: string): string[] => {
  const raw =
    /^<[^>]*\bclass="([^"]*)"/u.exec(outerHTML.slice(0, 4000))?.[1] ?? "";

  return raw.split(/\s+/u).filter(Boolean);
};

const ClassLine = ({
  info,
  resolved,
}: {
  readonly info: TailwindOutcome | null;
  readonly resolved: string[];
}): ReactElement | null => {
  if (!info || info.mode === "none") {
    return null;
  }

  const own = info.classes.length > 0;
  const list = own ? info.classes : resolved;
  const text = list.length > 0 ? list.join(" ") : "No classes yet";

  return (
    <InspectorSection
      title={copy.classes}
      className="ins-classes"
      aside={
        !own && list.length > 0 ? (
          <span className="ins-classes-tag">{copy.readOnly}</span>
        ) : undefined
      }
    >
      <code
        className={`ins-classes-list${own ? "" : " resolved"}`}
        aria-label={
          own ? "Tailwind classes" : "Classes from the component, read only"
        }
      >
        {text}
        {info.dynamic && (
          <span className="ins-classes-more"> {copy.dynamic}</span>
        )}
      </code>
      {info.note && <p className="ins-note ins-classes-note">{info.note}</p>}
    </InspectorSection>
  );
};

export { domClasses, ClassLine };
