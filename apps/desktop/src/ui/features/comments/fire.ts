import { startTransition } from "react";

const fire = (task: () => Promise<void>): void => {
  startTransition(async () => {
    await task();
  });
};

export { fire };
