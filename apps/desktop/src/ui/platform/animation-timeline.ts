import { createLiveStore } from "./live-store.js";

const animationTimeline = createLiveStore(false);

export { animationTimeline };
