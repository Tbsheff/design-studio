import { useCallback, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { directEditRoutes, textRoutes, useAction } from "./deps.js";
import type { RouteOutput, SelectionContext } from "./deps.js";
import { toEditBody } from "./text-rewrite-model.js";
import type { RewriteMode } from "./text-rewrite-model.js";

type RewriteResult = RouteOutput<typeof textRoutes.runText>;

interface RewriteIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface TextRewrite {
  readonly apply: () => void;
  readonly error: string | null;
  readonly isPending: boolean;
  readonly note: string | null;
  readonly reset: () => void;
  readonly result: RewriteResult | null;
  readonly run: (mode: RewriteMode, language: string | null) => void;
  readonly select: (index: number) => void;
  readonly selected: number;
}

const useTextRewrite = (
  ids: RewriteIds,
  target: SelectionContext
): TextRewrite => {
  const runner = useAction(textRoutes.runText);
  const editor = useAction(directEditRoutes.applyDirectEdit);

  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(
    null
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [layerNote, setLayerNote] = useState<string | null>(null);

  const [isWorking, startWork] = useTransition();
  const { run: runRewrite } = runner;
  const { run: runEdit } = editor;
  const { source } = target;

  const runMode = useCallback(
    (mode: RewriteMode, language: string | null): void => {
      if (source === null) {
        return;
      }

      startWork(async () => {
        const done = await runRewrite({
          ...ids,
          language,
          layer: { column: source.col, file: source.file, line: source.line },
          mode,
          shouldApply: false,
        });

        setLayerNote(null);
        setSelectedIndex(0);
        setRewriteResult(done);
      });
    },
    [ids, runRewrite, source]
  );

  const applyChoice = useCallback((): void => {
    const text = rewriteResult?.options.at(selectedIndex) ?? null;

    if (text === null || source === null) {
      return;
    }

    startWork(async () => {
      const done = await runEdit(
        toEditBody(ids, target, text, rewriteResult?.layerText ?? target.text)
      );

      if (done !== null) {
        setLayerNote(copy.applied);
        setRewriteResult(null);
      }
    });
  }, [ids, rewriteResult, runEdit, selectedIndex, source, target]);

  const resetRewriteResult = useCallback((): void => {
    setRewriteResult(null);
    setSelectedIndex(0);
  }, []);

  return {
    apply: applyChoice,
    error: runner.error?.message ?? editor.error?.message ?? null,
    isPending: isWorking || runner.pending || editor.pending,
    note: layerNote,
    reset: resetRewriteResult,
    result: rewriteResult,
    run: runMode,
    select: setSelectedIndex,
    selected: selectedIndex,
  };
};

export { useTextRewrite };

export type { TextRewrite };
