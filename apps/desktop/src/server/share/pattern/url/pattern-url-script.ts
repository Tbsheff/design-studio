const CANDIDATES_SCRIPT = String.raw`(() => {
  const vw = window.innerWidth;
  const SKIP = new Set(["script","style","noscript","template","link","meta","head","svg"]);
  const isShown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id && document.querySelectorAll("#" + CSS.escape(node.id)).length === 1) {
        parts.unshift("#" + CSS.escape(node.id));
        return parts.join(" > ");
      }
      const tag = node.localName;
      const same = Array.from(node.parentElement.children).filter((c) => c.localName === tag);
      if (same.length > 1) parts.unshift(tag + ":nth-of-type(" + (same.indexOf(node) + 1) + ")");
      else parts.unshift(tag);
      node = node.parentElement;
    }
    parts.unshift("body");
    return parts.join(" > ");
  };
  const landmarks = Array.from(document.querySelectorAll("header, nav, main > section, footer")).filter((el) => isShown(el) && !SKIP.has(el.localName));
  const blocks = [];
  const walk = (el, depth) => {
    for (const child of Array.from(el.children)) {
      if (SKIP.has(child.localName) || !isShown(child)) continue;
      const r = child.getBoundingClientRect();
      if (r.height > 120 && r.width > vw * 0.4) blocks.push(child);
      if (depth < 4) walk(child, depth + 1);
    }
  };
  walk(document.body, 1);
  const keptBlocks = blocks.filter((el) => {
    if (landmarks.includes(el)) return false;
    if (landmarks.some((mark) => mark.contains(el) || el.contains(mark))) return false;
    return !blocks.some((other) => other !== el && el.contains(other) && !landmarks.includes(other));
  });
  const all = Array.from(new Set(landmarks.concat(keptBlocks)));
  const top = (el) => el.getBoundingClientRect().top + window.scrollY;
  all.sort((a, b) => top(a) - top(b));
  const labelOf = (el) => {
    const heading = el.querySelector("h1, h2, h3");
    const text = heading ? heading.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : "";
    const name = el.getAttribute("aria-label") || el.id || "";
    const detail = text || name;
    return detail ? el.localName + ": " + detail : el.localName;
  };
  return all.slice(0, 40).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      box: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) },
      label: labelOf(el),
      selector: pathOf(el),
      textSample: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 160),
    };
  });
})()`;

const PINS_SCRIPT = String.raw`(selector) => {
  const el = document.querySelector(selector);
  if (!el) return {};
  const names = ["color","font-family","font-size","font-style","font-weight","letter-spacing","line-height","text-align","text-transform","white-space","word-spacing"];
  const cs = getComputedStyle(el);
  const pins = {};
  for (const name of names) pins[name] = cs.getPropertyValue(name);
  const isClear = (value) => !value || value === "transparent" || /rgba\(.*,\s*0\)$/.test(value);
  let node = el;
  let background = "";
  while (node && node.nodeType === 1) {
    const value = getComputedStyle(node).getPropertyValue("background-color");
    if (!isClear(value)) { background = value; break; }
    node = node.parentElement;
  }
  if (isClear(cs.getPropertyValue("background-color"))) pins["background-color"] = background || "rgb(255, 255, 255)";
  return pins;
}`;

export { CANDIDATES_SCRIPT, PINS_SCRIPT };
