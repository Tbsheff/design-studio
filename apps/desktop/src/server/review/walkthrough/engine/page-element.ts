interface ElementBox {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface PageElement {
  readonly box: ElementBox;
  readonly hasName: boolean;
  readonly href: string | null;
  readonly id: number;
  readonly isField: boolean;
  readonly isInView: boolean;
  readonly layerId: string | null;
  readonly name: string;
  readonly role: string;
  readonly selector: string;
}

type StepAction = "click" | "done" | "scroll" | "stuck" | "type";

interface StepChoice {
  readonly action: StepAction;
  readonly element: PageElement | null;
  readonly friction: FrictionDraft | null;
  readonly reason: string;
  readonly text: string | null;
}

interface FrictionDraft {
  readonly fix: string;
  readonly severity: "high" | "low" | "medium";
  readonly text: string;
}

interface StepRecord {
  readonly action: StepAction;
  readonly index: number;
  readonly layerId: string | null;
  readonly reason: string;
  readonly shotPath: string;
  readonly targetName: string;
  readonly url: string;
}

interface FrictionRecord extends FrictionDraft {
  readonly step: number;
}

type Outcome = "done" | "max-steps" | "stuck";

export type {
  ElementBox,
  FrictionDraft,
  FrictionRecord,
  Outcome,
  PageElement,
  StepAction,
  StepChoice,
  StepRecord,
};
