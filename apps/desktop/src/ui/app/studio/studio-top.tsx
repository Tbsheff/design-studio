import type { ReactElement } from "react";

import { StudioTopBar } from "../shell/studio-top-bar";
import { headerProps } from "./left-props";
import type { StudioCtxProps } from "./studio-context";

const StudioTop = ({ ctx }: StudioCtxProps): ReactElement => {
  const {
    setTopCenter: handleCenter,
    setTopEnd: handleEnd,
    setTopStart: handleStart,
  } = ctx.ui;

  return (
    <StudioTopBar
      header={headerProps(ctx)}
      onStart={handleStart}
      onCenter={handleCenter}
      onEnd={handleEnd}
    />
  );
};

export { StudioTop };
