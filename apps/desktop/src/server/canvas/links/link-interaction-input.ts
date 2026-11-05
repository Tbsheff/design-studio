import type {
  LinkTriggerKind,
  LinkVisibility,
} from "@design-studio/contracts/link-interaction";
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
  readonly key: string | null;
  readonly linkId: string | null;
  readonly selector: string | null;
  readonly target: string | null;
  readonly toFrame: string | null;
  readonly transition: LinkTransition | null;
  readonly trigger: LinkTriggerKind | null;
  readonly url: string | null;
  readonly visibility: LinkVisibility | null;
}

export type { LinkInteractionRequest };
