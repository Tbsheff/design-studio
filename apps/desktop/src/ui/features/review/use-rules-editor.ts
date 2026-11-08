import type {
  DesignRulesState,
  DesignRulesTestResult,
} from "@design-studio/contracts/design-rules";
import { useCallback, useEffect, useState, useTransition } from "react";

import { errorText, rulesApi } from "../../api.js";
import { pick } from "./pick.js";

interface LiveFrame {
  frame: string;
  height: number;
  path?: string;
  width: number;
}

interface RulesEditorState {
  error: string | null;
  isSaving: boolean;
  isTesting: boolean;
  note: string | null;
  result: DesignRulesTestResult | null;
  state: DesignRulesState | null;
  text: string;
  save: () => void;
  setText: (text: string) => void;
  test: () => void;
}

const useRulesLoad = (
  projectId: string,
  directionId: string,
  onLoaded: (next: DesignRulesState) => void,
  onFailed: (message: string) => void
): void => {
  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const next = await rulesApi.get(projectId, directionId);

        if (live) {
          onLoaded(next);
        }
      } catch (error) {
        if (live) {
          onFailed(errorText(error));
        }
      }
    };

    load();

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, onLoaded, onFailed]);
};

const useRulesEditor = (
  projectId: string,
  directionId: string,
  getFrame: (projectId: string) => LiveFrame | null
): RulesEditorState => {
  const [state, setState] = useState<DesignRulesState | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<DesignRulesTestResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isTesting, startTest] = useTransition();
  const [isSaving, startSave] = useTransition();

  const onLoaded = useCallback((next: DesignRulesState): void => {
    setState(next);
    setText(next.text);
  }, []);

  useRulesLoad(projectId, directionId, onLoaded, setFailure);

  const test = useCallback((): void => {
    setFailure(null);
    setNote(null);

    startTest(async () => {
      try {
        const frame = getFrame(projectId);

        if (frame) {
          setResult(await rulesApi.test(projectId, directionId, text, frame));
        } else {
          setResult(await rulesApi.test(projectId, directionId, text));
        }
      } catch (error) {
        setFailure(errorText(error));
      }
    });
  }, [projectId, directionId, text, getFrame]);

  const save = useCallback((): void => {
    setFailure(null);
    setNote(null);

    startSave(async () => {
      try {
        const saved = await rulesApi.save(projectId, directionId, text);

        setState(saved.state);
        setText(saved.state.text);
        setNote(pick(saved.versionId, "Saved as a new version.", "Saved."));
      } catch (error) {
        setFailure(errorText(error));
      }
    });
  }, [projectId, directionId, text]);

  return {
    error: failure,
    isSaving,
    isTesting,
    note,
    result,
    save,
    setText,
    state,
    test,
    text,
  };
};

export { useRulesEditor };

export type { LiveFrame };
