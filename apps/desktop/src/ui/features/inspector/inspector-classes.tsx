import type {
  ElementSourceInfo,
  SourceLoc,
  TailwindOutcome,
} from "@design-studio/contracts";
import type { ReactElement } from "react";
import { startTransition, useEffect, useState } from "react";

import type { VariantSupport } from "../../../shared/variants.js";
import { api } from "../../api.js";
import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";

interface ElementClasses {
  readonly tailwind: TailwindOutcome | null;
  readonly element: ElementSourceInfo | null;
  readonly variants: VariantSupport | null;
}

const NO_CLASSES: ElementClasses = {
  element: null,
  tailwind: null,
  variants: null,
};

const useElementClasses = (
  projectId: string,
  directionId: string | null,
  source: SourceLoc | null,
  savedAt: number,
  variant = ""
): ElementClasses => {
  const [info, setInfo] = useState<ElementClasses>(NO_CLASSES);
  const file = source?.file;
  const line = source?.line;
  const col = source?.col;
  useEffect(() => {
    if (
      !directionId ||
      file === undefined ||
      line === undefined ||
      col === undefined
    ) {
      setInfo(NO_CLASSES);

      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const result = await api.elementClasses(
          projectId,
          directionId,
          { col, file, line },
          variant
        );

        if (live) {
          setInfo({
            element: result.element ?? null,
            tailwind: result.tailwind,
            variants: result.variants ?? null,
          });
        }
      } catch {
        if (live) {
          setInfo(NO_CLASSES);
        }
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, file, line, col, savedAt, variant]);

  return info;
};

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
          <span className="ins-classes-tag">Read only</span>
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
        {info.dynamic && <span className="ins-classes-more"> + dynamic</span>}
      </code>
      {info.note && <p className="ins-note ins-classes-note">{info.note}</p>}
    </InspectorSection>
  );
};

export { useElementClasses, domClasses, ClassLine };

export type { ElementClasses };
