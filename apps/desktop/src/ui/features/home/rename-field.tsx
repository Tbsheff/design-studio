import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent, ReactElement } from "react";

import { toRenamedName } from "./card-menu-model.js";
import { copy } from "./copy.js";

const NAME_MAX = 120;

interface RenameFieldProps {
  readonly project: Project;
  readonly onDone: (name: string | null) => void;
}

const RenameField = ({ project, onDone }: RenameFieldProps): ReactElement => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = useCallback((): void => {
    onDone(toRenamedName(ref.current?.value ?? "", project.name));
  }, [onDone, project.name]);

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      finish();
    },
    [finish]
  );

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDone(null);
      }
    },
    [onDone]
  );

  return (
    <form className="project-rename" onSubmit={submit}>
      <input
        ref={ref}
        name="name"
        aria-label={copy.projectName}
        defaultValue={project.name}
        maxLength={NAME_MAX}
        onBlur={finish}
        onKeyDown={keyDown}
      />
    </form>
  );
};

export { RenameField };

export type { RenameFieldProps };
