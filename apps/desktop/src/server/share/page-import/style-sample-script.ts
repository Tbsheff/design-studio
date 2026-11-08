const SAMPLE_BODY = String.raw`() => {
  const MAX_ELEMENTS = 4000;
  const VIEW_WIDTH = window.innerWidth;
  const VIEW_HEIGHT = window.innerHeight;
  const AREA_HEIGHT_MAX = VIEW_HEIGHT * 4;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const hex2 = (value) => value.toString(16).padStart(2, "0");
  const parse = (css) => {
    if (!css || css === "transparent") return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000";
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    if (data[3] < 128) return null;
    return { r: data[0], g: data[1], b: data[2], hex: "#" + hex2(data[0]) + hex2(data[1]) + hex2(data[2]) };
  };
  const bucketOf = (color) => [color.r, color.g, color.b].map((value) => Math.round(value / 8)).join(",");
  const background = new Map();
  const text = new Map();
  const add = (table, color, weight) => {
    const key = bucketOf(color);
    const found = table.get(key);
    if (found) { found.weight += weight; return; }
    table.set(key, { hex: color.hex, weight });
  };
  const visibleArea = (rect) => {
    const left = Math.max(0, rect.left);
    const right = Math.min(VIEW_WIDTH, rect.right);
    const top = Math.max(0, rect.top + window.scrollY);
    const bottom = Math.min(AREA_HEIGHT_MAX, rect.bottom + window.scrollY);
    return Math.max(0, right - left) * Math.max(0, bottom - top);
  };
  const isShown = (style) => style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.05;
  const pageBackground = parse(getComputedStyle(document.body).backgroundColor) || parse(getComputedStyle(document.documentElement).backgroundColor) || parse("#ffffff");
  add(background, pageBackground, VIEW_WIDTH * AREA_HEIGHT_MAX * 0.5);
  const elements = Array.from(document.body.querySelectorAll("*")).slice(0, MAX_ELEMENTS);
  const buttons = [];
  for (const el of elements) {
    const style = getComputedStyle(el);
    if (!isShown(style)) continue;
    const rect = el.getBoundingClientRect();
    const area = visibleArea(rect);
    if (area < 16) continue;
    const fill = parse(style.backgroundColor);
    if (fill) add(background, fill, area);
    let chars = 0;
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) chars += child.nodeValue.trim().length;
    }
    if (chars > 0) {
      const color = parse(style.color);
      const size = parseFloat(style.fontSize) || 16;
      if (color) add(text, color, chars * size * size * 0.5);
    }
    const isButton = el.matches("button, [role=button], input[type=submit], a[class*=btn], a[class*=button], a[class*=cta]");
    if (isButton) buttons.push({ area, el, fill, style });
  }
  const total = (table) => Array.from(table.values()).reduce((sum, item) => sum + item.weight, 0) || 1;
  const backgroundTotal = total(background);
  const textTotal = total(text);
  const merged = new Map();
  for (const item of background.values()) {
    merged.set(item.hex, { hex: item.hex, share: (item.weight / backgroundTotal) * 0.8 });
  }
  for (const item of text.values()) {
    const found = merged.get(item.hex);
    const share = (item.weight / textTotal) * 0.2;
    if (found) found.share += share;
    else merged.set(item.hex, { hex: item.hex, share });
  }
  const colors = Array.from(merged.values()).sort((a, b) => b.share - a.share).slice(0, 8);
  const biggest = (table) => Array.from(table.values()).sort((a, b) => b.weight - a.weight)[0] || null;
  const chroma = (color) => Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
  const filled = buttons.filter((button) => button.fill && button.area > 200).sort((a, b) => b.area - a.area);
  const colorful = filled.filter((button) => chroma(button.fill) > 40);
  const primaryButton = colorful[0] || filled.find((button) => button.fill.hex !== pageBackground.hex) || null;
  const radii = new Map();
  for (const button of buttons) {
    const value = button.style.borderTopLeftRadius;
    if (value && value !== "0px") radii.set(value, (radii.get(value) || 0) + 1);
  }
  const radius = Array.from(radii.entries()).sort((a, b) => b[1] - a[1])[0];
  const family = (el) => el ? getComputedStyle(el).fontFamily : null;
  const heading = document.querySelector("h1") || document.querySelector("h2");
  const bgTop = biggest(background);
  const fgTop = biggest(text);
  return {
    bg: bgTop ? bgTop.hex : null,
    body: family(document.body),
    colors,
    display: family(heading),
    fg: fgTop ? fgTop.hex : null,
    primary: primaryButton ? primaryButton.fill.hex : null,
    radius: radius ? radius[0] : null,
    title: document.title || "",
  };
}`;

const toSampleScript = (): string => `(${SAMPLE_BODY})()`;

export { toSampleScript as sampleScript };
