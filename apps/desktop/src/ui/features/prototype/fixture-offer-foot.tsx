import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { FixtureOffer } from "./fixture-offer-model.js";
import { toFixtureLabel } from "./fixture-offer-model.js";
import { useFixtureOffer } from "./use-fixture-offer.js";

import styles from "./prototype.module.css";

interface FixtureOfferFootProps {
  readonly offer: FixtureOffer;
  readonly onCreated: (projectId: string) => void;
  readonly prompt: string;
}

const FixtureOfferFoot = ({
  offer,
  onCreated,
  prompt,
}: FixtureOfferFootProps): ReactElement => {
  const state = useFixtureOffer(offer, prompt, onCreated);

  return (
    <>
      <output className={styles.offer} data-testid="fixture-offer">
        <span className={styles.offerTitle}>{copy.fixtureTitle}</span>
        <span className={styles.hint}>{offer.reason}</span>
        <span className={styles.hint}>{copy.fixtureNote}</span>
      </output>
      <footer className={styles.foot}>
        {state.failure !== null && (
          <p className={styles.failure} role="alert">
            {state.failure}
          </p>
        )}
        <button
          type="button"
          className="btn small"
          disabled={state.isPending}
          onClick={state.handleOpen}
        >
          {copy.fixtureOpen}
        </button>
        <button
          type="button"
          className="btn small primary"
          disabled={state.isPending}
          onClick={state.handleMake}
          data-testid="fixture-offer-make"
        >
          {toFixtureLabel(state.isPending)}
        </button>
      </footer>
    </>
  );
};

export { FixtureOfferFoot };

export type { FixtureOfferFootProps };
