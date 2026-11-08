import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { copy } from "./copy.js";
import { MAX_FOCUS_LENGTH, improvePassed } from "./draft-improve-model.js";
import type { RunView } from "./run-state-model.js";

interface ImproveProps {
  readonly onImprove: (focus: string) => Promise<void>;
  readonly run: RunView | null;
  readonly running: boolean;
}

const toLabel = (improving: boolean): string => {
  if (improving) {
    return "Improving…";
  }

  return "Improve with AI";
};

const ImproveControl = ({
  running,
  run,
  onImprove,
}: ImproveProps): ReactElement => {
  const improving = run?.status === "running";
  const [focus, setFocus] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (running || isPending) {
        return;
      }

      startTransition(async () => {
        await onImprove(focus);
        setFocus("");
      });
    },
    [focus, isPending, onImprove, running]
  );

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setFocus(event.target.value);
  }, []);

  return (
    <form className="draft-improve" onSubmit={onSubmit}>
      <input
        className="draft-focus"
        value={focus}
        maxLength={MAX_FOCUS_LENGTH}
        placeholder={copy.whatShouldThe}
        aria-label={copy.whatShouldThe}
        disabled={running}
        onChange={onChange}
      />
      <button
        type="submit"
        className={cn("btn small", !improvePassed(run) && "primary")}
        disabled={running || isPending}
      >
        {toLabel(improving)}
      </button>
    </form>
  );
};

export { ImproveControl };
