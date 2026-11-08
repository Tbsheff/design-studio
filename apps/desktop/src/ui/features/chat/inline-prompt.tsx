import type { EditScopeChoice } from "@design-studio/contracts/usage-scope";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { stopEvent } from "./event-model.js";
import { scopeOf, toBoxStyle, toSharedUsage } from "./inline-prompt-model.js";
import { InlinePromptRow } from "./inline-prompt-row.js";
import { ScopeSection } from "./scope-section.js";
import type { InlinePromptView } from "./use-inline-prompt.js";
import { useUsage } from "./use-usage.js";

interface InlinePromptProps {
  readonly frame: { width: number; height: number };
  readonly view: InlinePromptView;
  readonly zoom: number;
}

const InlinePrompt = ({
  view,
  zoom,
  frame,
}: InlinePromptProps): ReactElement => {
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<EditScopeChoice>("this");
  const input = useRef<HTMLInputElement>(null);
  const usage = useUsage(view.usageFile, view.usedAtFile, view.route);
  const { rect, close, submit: submitView } = view;

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const style = useMemo(
    () => toBoxStyle(rect, zoom, frame),
    [rect, zoom, frame]
  );

  const onSubmit = useCallback((): void => {
    const scope = scopeOf(usage, choice);

    if (scope === null) {
      submitView(text);

      return;
    }

    submitView(text, scope);
  }, [choice, submitView, text, usage]);

  const onBoxKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      event.stopPropagation();

      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    },
    [close]
  );

  const isReady = text.trim().length > 0 && !view.blocked;

  return (
    <div
      className="inline-prompt"
      data-testid="inline-prompt"
      role="presentation"
      style={style}
      onPointerDown={stopEvent}
      onWheel={stopEvent}
      onKeyDown={onBoxKeyDown}
      onKeyUp={stopEvent}
    >
      <InlinePromptRow
        label={view.label}
        blocked={view.blocked}
        text={text}
        isReady={isReady}
        inputRef={input}
        onText={setText}
        onSubmit={onSubmit}
      />
      <ScopeSection
        usage={toSharedUsage(usage)}
        choice={choice}
        onChoice={setChoice}
      />
    </div>
  );
};

export { InlinePrompt };

export type { InlinePromptProps };
