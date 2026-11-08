import { useEffect, useRef } from "react";

import {
  onOpenAppRequest,
  takeOpenAppRequest,
} from "../../platform/app-events.js";

const useOpenAppRequests = (
  onPath: (path: string) => void,
  onPick: () => void
): void => {
  const handlers = useRef({ onPath, onPick });
  useEffect(() => {
    handlers.current = { onPath, onPick };
  }, [onPath, onPick]);
  useEffect(() => {
    const take = (): void => {
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
};

export { useOpenAppRequests };
