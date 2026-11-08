import type { ReactElement } from "react";

import { copy } from "./copy.js";

const HomeTitle = ({
  isEmpty,
}: {
  readonly isEmpty: boolean;
}): ReactElement => {
  if (isEmpty) {
    return <h1 className="ui-display">{copy.whatShouldWeDesign}</h1>;
  }

  return <h1 className="sr-only">{copy.home}</h1>;
};

export { HomeTitle };
