import { copy } from "./copy.js";

interface FixtureOffer {
  readonly appProjectId: string;
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

export { toFixtureLabel };

export type { FixtureOffer };
