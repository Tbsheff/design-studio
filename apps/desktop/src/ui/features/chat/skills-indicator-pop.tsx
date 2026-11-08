import type { ReactElement } from "react";
import { useEffect } from "react";

import { copy } from "./copy.js";
import { SkillsChecklist } from "./skills-checklist.js";
import { useDismiss } from "./use-dismiss.js";
import { useFitAbove } from "./use-fit-above.js";

const SKILL_POPOVER_HEIGHT = 520;

const SkillsIndicatorPop = (props: {
  disabled: string[];
  allowBash: boolean;
  error: string | null;
  onChange: (next: string[]) => void;
  onClose: () => void;
}): ReactElement => {
  const ref = useDismiss<HTMLDialogElement>(props.onClose);
  useFitAbove(ref, SKILL_POPOVER_HEIGHT);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <dialog
      ref={ref}
      open
      className="skill-pop skills-ind-pop settings-fields"
      aria-label={copy.skillsForThisProject}
    >
      <SkillsChecklist
        disabled={props.disabled}
        allowBash={props.allowBash}
        onChange={props.onChange}
      />
      {props.error && (
        <div className="alert error" role="alert">
          {props.error}
        </div>
      )}
    </dialog>
  );
};

export { SkillsIndicatorPop };
