import type { SyntheticEvent } from "react";

const stopEvent = (event: SyntheticEvent): void => {
  event.stopPropagation();
};

const preventDefault = (event: SyntheticEvent): void => {
  event.preventDefault();
};

export { preventDefault, stopEvent };
