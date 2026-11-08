import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { useConversation } from "../../ai/components/ai/use-conversation.js";
import { toEarlierLabel } from "./earlier-runs-model.js";
import { useOlderRuns } from "./run-history-model.js";

const NEAR_TOP_PX = 800;

const EarlierRuns = ({
  hidden,
  onMore,
}: {
  hidden: number;
  onMore: () => void;
}): ReactElement | null => {
  const { viewportRef, wasAtBottomRef } = useConversation();
  const ref = useRef<HTMLButtonElement | null>(null);
  const older = useOlderRuns();
  const shown = hidden > 0 || older.more;
  useEffect(() => {
    const el = ref.current;
    const root = viewportRef.current;

    const isIdle = hidden <= 0 && !older.more;

    if (!el || !root || isIdle || older.loading) {
      return;
    }

    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          wasAtBottomRef.current ||
          !entries.some((entry) => entry.isIntersecting)
        ) {
          return;
        }

        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(onMore);
      },
      { root, rootMargin: `${NEAR_TOP_PX}px 0px 0px 0px` }
    );

    observer.observe(el);

    return (): void => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [hidden, older.more, older.loading, onMore, viewportRef, wasAtBottomRef]);

  if (!shown) {
    return null;
  }

  return (
    <button
      ref={ref}
      type="button"
      className="btn ghost small chat-earlier"
      onClick={onMore}
    >
      {toEarlierLabel(hidden, older.loading)}
    </button>
  );
};

export { EarlierRuns };
