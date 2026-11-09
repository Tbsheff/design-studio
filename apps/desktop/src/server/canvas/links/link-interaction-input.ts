import type {
  LinkPlacement,
  LinkTriggerKind,
  LinkVisibility,
} from "@design-studio/contracts/link-interaction";
import type {
  LinkVariableOp,
  LinkVariableValue,
} from "@design-studio/contracts/link-variable";
import type {
  LinkAction,
  LinkEasing,
  LinkTransition,
} from "@design-studio/contracts/links";

interface LinkInteractionRequest {
  readonly action: LinkAction | null;
  readonly delayMs: number | null;
  readonly duration: number | null;
  readonly easing: LinkEasing | null;
  readonly fromFrame: string | null;
  readonly isOutsideClose: boolean | null;
  readonly isWhenCleared: boolean;
  readonly key: string | null;
  readonly linkId: string | null;
  readonly placement: LinkPlacement | null;
  readonly selector: string | null;
  readonly target: string | null;
  readonly toFrame: string | null;
  readonly transition: LinkTransition | null;
  readonly trigger: LinkTriggerKind | null;
  readonly url: string | null;
  readonly variableName: string | null;
  readonly variableOp: LinkVariableOp | null;
  readonly variableValue: LinkVariableValue | null;
  readonly visibility: LinkVisibility | null;
  readonly whenEquals: LinkVariableValue | null;
  readonly whenName: string | null;
}

export type { LinkInteractionRequest };
