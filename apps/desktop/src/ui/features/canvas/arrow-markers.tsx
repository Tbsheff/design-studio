import type { ReactElement } from "react";

const MARKERS = [
  { className: "link-head", id: "link-head" },
  { className: "link-head broken", id: "link-head-broken" },
];

const ArrowMarkers = (): ReactElement => (
  <defs>
    {MARKERS.map((marker) => (
      <marker
        key={marker.id}
        id={marker.id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" className={marker.className} />
      </marker>
    ))}
  </defs>
);

export { ArrowMarkers };
