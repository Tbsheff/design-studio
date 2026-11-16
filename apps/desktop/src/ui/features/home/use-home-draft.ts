import type {
  ClarifyQuestion,
  ProjectKind,
  RunLevel,
  Starter,
} from "@design-studio/contracts";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { focusRequest } from "./focus-bus-model.js";
import { modelSummary } from "./home-model.js";

interface SettingsLike {
  readonly defaultLevel: RunLevel;
  readonly model: string;
}

interface TemplatePick {
  readonly id: string;
  readonly kind?: ProjectKind;
  readonly label: string;
  readonly level?: RunLevel;
  readonly prompt: string;
}

interface TemplateChoice {
  readonly id: string;
  readonly label: string;
  readonly starter: Starter | null;
}

interface DraftConfig<Draft extends SettingsLike> {
  readonly initialDraft: () => Draft;
  readonly maxDesignsFor: (kind: ProjectKind) => number;
  readonly modelIds: readonly string[];
}

interface HomeDraft<Draft extends SettingsLike> {
  readonly changeKind: (next: ProjectKind) => void;
  readonly designCount: number;
  readonly kind: ProjectKind;
  readonly maxDesigns: number;
  readonly modelSizes: string[];
  readonly modelValue: string;
  readonly pickTemplate: (
    picked: TemplatePick,
    starter: Starter | null
  ) => void;
  readonly prompt: string;
  readonly questions: ClarifyQuestion[] | null;
  readonly setDesigns: Dispatch<SetStateAction<number>>;
  readonly setPrompt: Dispatch<SetStateAction<string>>;
  readonly setQuestions: Dispatch<SetStateAction<ClarifyQuestion[] | null>>;
  readonly setSettingsDraft: Dispatch<SetStateAction<Draft>>;
  readonly settingsDraft: Draft;
  readonly template: TemplateChoice | null;
}

const useHomeDraft = <Draft extends SettingsLike>(
  config: DraftConfig<Draft>
): HomeDraft<Draft> => {
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<ProjectKind>("html");
  const [designs, setDesigns] = useState(1);
  const [template, setTemplate] = useState<TemplateChoice | null>(null);
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null);
  const [settingsDraft, setSettingsDraft] = useState(config.initialDraft);

  const maxDesigns = config.maxDesignsFor(kind);
  const designCount = Math.min(designs, maxDesigns);

  const pickTemplate = (
    picked: TemplatePick,
    starter: Starter | null
  ): void => {
    if (template?.id === picked.id) {
      setTemplate(null);

      return;
    }

    setTemplate({ id: picked.id, label: picked.label, starter });
    setPrompt(picked.prompt);
    setQuestions(null);

    if (picked.kind) {
      setKind(picked.kind);
    }

    const { level } = picked;

    if (level) {
      setSettingsDraft((detail) => ({ ...detail, defaultLevel: level }));
    }

    focusRequest("prompt", true, false);
  };

  const changeKind = (next: ProjectKind): void => {
    setKind(next);
    setDesigns((count) => Math.min(count, config.maxDesignsFor(next)));
  };

  const modelSizes = config.modelIds.map((id) => modelSummary(id));
  const modelValue = modelSummary(settingsDraft.model);

  return {
    changeKind,
    designCount,
    kind,
    maxDesigns,
    modelSizes,
    modelValue,
    pickTemplate,
    prompt,
    questions,
    setDesigns,
    setPrompt,
    setQuestions,
    setSettingsDraft,
    settingsDraft,
    template,
  };
};

export { useHomeDraft };

export type { DraftConfig, HomeDraft, SettingsLike, TemplateChoice };
