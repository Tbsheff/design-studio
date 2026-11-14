import { copy } from "./copy.js";

interface FixtureOffer {
  readonly appProjectId: string;
  readonly copyDirectionId: string;
  readonly copyProjectId: string;
  readonly reason: string;
  readonly route: string;
}

const toFixtureLabel = (isPending: boolean): string => {
  if (isPending) {
    return copy.fixtureMaking;
  }

  return copy.fixtureMake;
};

const MAIN_DIRECTION = "main";

const toMainDirectionId = (
  directions: readonly { readonly id: string }[]
): string => {
  const main = directions.find((direction) => direction.id === MAIN_DIRECTION);

  return main?.id ?? directions[0]?.id ?? MAIN_DIRECTION;
};

const toOpenPrompt = (offer: FixtureOffer, prompt: string): string =>
  `Redesign ${offer.route}: ${prompt}`;

export { toFixtureLabel, toMainDirectionId, toOpenPrompt };

export type { FixtureOffer };
