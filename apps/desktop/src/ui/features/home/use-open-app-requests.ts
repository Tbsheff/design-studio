import { useEffect, useRef } from "react";

import {
  onOpenAppRequest,
  takeOpenAppRequest,
} from "../../platform/app-events.js";

function useOpenAppRequests(
  onPath: (path: string) => void,
  onPick: () => void
): void {
  const handlers = useRef({ onPath, onPick });
  handlers.current = { onPath, onPick };
  useEffect(() => {
    const take = () => {
      const request = takeOpenAppRequest();

      if (!request) {
        return;
      }

      if (request.path) {
        handlers.current.onPath(request.path);
      } else {
        handlers.current.onPick();
      }
    };

    take();

    return onOpenAppRequest(take);
  }, []);
}

export { useOpenAppRequests };
