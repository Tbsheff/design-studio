import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const SendGlyph = ({
  isWorking,
}: {
  readonly isWorking: boolean;
}): ReactElement => {
  if (isWorking) {
    return (
      <span key="busy" className="home-send-glyph">
        <span className="spinner" />
      </span>
    );
  }

  return (
    <span key="idle" className="home-send-glyph">
      <Icon name="arrowUp" size={16} />
    </span>
  );
};

export { SendGlyph };
