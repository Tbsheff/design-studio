const COLLECT_BODY = String.raw`(args) => {
  const SKIP = new Set(["script","noscript","iframe","frame","frameset","object","embed","template","link","meta","style","base","head","title","slot","video","audio","canvas","portal","applet","param","source","track"]);
  const REPLACED = new Set(["img","svg","input","textarea","select","button","hr"]);
  const OWN = ["display","position","top","right","bottom","left","z-index","float","clear","box-sizing","min-width","max-width","min-height","max-height","margin-top","margin-right","margin-bottom","margin-left","padding-top","padding-right","padding-bottom","padding-left","border-top-width","border-right-width","border-bottom-width","border-left-width","border-top-style","border-right-style","border-bottom-style","border-left-style","border-top-color","border-right-color","border-bottom-color","border-left-color","border-top-left-radius","border-top-right-radius","border-bottom-right-radius","border-bottom-left-radius","background-color","background-image","background-size","background-position","background-repeat","box-shadow","opacity","overflow-x","overflow-y","flex-direction","flex-wrap","justify-content","align-items","align-content","align-self","flex-grow","flex-shrink","flex-basis","order","row-gap","column-gap","grid-template-columns","grid-template-rows","grid-column-start","grid-column-end","grid-row-start","grid-row-end","grid-auto-flow","transform","text-decoration-line","vertical-align","object-fit","object-position","aspect-ratio","filter","fill","stroke"];
  const INHERITED = ["color","font-family","font-size","font-weight","font-style","line-height","letter-spacing","text-align","text-transform","white-space","word-spacing","list-style-type"];
  const SIZE = ["width","height"];
  const HTML_ATTRS = new Set(["alt","title","role","type","placeholder","value","colspan","rowspan","lang","dir","datetime","checked","disabled","width","height","start","reversed","scope","headers","abbr","label"]);
  const out = { ok: true, title: document.title || "", lang: document.documentElement.lang || "", url: location.href, width: 0, height: 0, root: null, fontFaces: [], families: [], nodes: 0, truncated: false, removed: {} };
  const removed = (what) => { out.removed[what] = (out.removed[what] || 0) + 1; };
  let root = document.body;
  if (args.selector) {
    try { root = document.querySelector(args.selector); } catch (error) { return { ok: false, error: "the selector is not valid CSS: " + args.selector }; }
    if (!root) return { ok: false, error: "no element matches " + args.selector };
  }
  if (!root) return { ok: false, error: "the page has no body" };
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:absolute;left:-9999px;top:0;width:1200px;height:100px;border:0;visibility:hidden";
  document.documentElement.appendChild(frame);
  const blank = frame.contentDocument;
  blank.open(); blank.write("<!doctype html><html><head></head><body></body></html>"); blank.close();
  const view = frame.contentWindow;
  const defaults = new Map();
  const defaultsOf = (el) => {
    const key = el.namespaceURI + "|" + el.localName;
    if (defaults.has(key)) return defaults.get(key);
    const probe = blank.createElementNS(el.namespaceURI || "http://www.w3.org/1999/xhtml", el.localName);
    blank.body.appendChild(probe);
    const cs = view.getComputedStyle(probe);
    const map = {};
    for (const name of OWN.concat(INHERITED, SIZE)) map[name] = cs.getPropertyValue(name);
    probe.remove();
    defaults.set(key, map);
    return map;
  };
  const families = new Set();
  const isTracker = (el) => el.localName === "img" && el.naturalWidth <= 1 && el.naturalHeight <= 1 && el.complete && (el.getAttribute("width") === "1" || el.getAttribute("height") === "1" || el.naturalWidth === 1);
  const absolute = (raw) => { try { return new URL(raw, location.href).href; } catch (error) { return ""; } };
  const safeHref = (raw) => {
    if (!raw) return "";
    if (raw.startsWith("#")) return raw;
    const href = absolute(raw);
    return /^(https?:|mailto:|tel:)/i.test(href) ? href : "";
  };
  const styleOf = (el, parentStyle, isRoot) => {
    const cs = getComputedStyle(el);
    const base = defaultsOf(el);
    const style = {};
    for (const name of OWN) { const value = cs.getPropertyValue(name); if (value !== base[name]) style[name] = value; }
    for (const side of ["top","right","bottom","left"]) { const width = "border-" + side + "-width"; if (style["border-" + side + "-style"] && !(width in style)) style[width] = cs.getPropertyValue(width); }
    for (const name of INHERITED) {
      const value = cs.getPropertyValue(name);
      const against = isRoot || !parentStyle ? base[name] : parentStyle.getPropertyValue(name);
      if (value !== against) style[name] = value;
    }
    if (REPLACED.has(el.localName)) for (const name of SIZE) style[name] = cs.getPropertyValue(name);
    families.add(cs.getPropertyValue("font-family"));
    return { cs, style };
  };
  const attrsOf = (el, isSvg) => {
    const attrs = [];
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "class" || name === "id" || name === "srcset" || name === "sizes") { if (name.startsWith("on")) removed("event handler"); continue; }
      if (isSvg) {
        if (!/^[a-zA-Z:-]+$/.test(attr.name)) continue;
        if ((name === "href" || name === "xlink:href") && !attr.value.startsWith("#")) continue;
        attrs.push([attr.name, attr.value]);
        continue;
      }
      if (name.startsWith("aria-") || HTML_ATTRS.has(name)) attrs.push([name, attr.value]);
    }
    if (!isSvg && el.localName === "a") { const href = safeHref(el.getAttribute("href")); if (href) attrs.push(["href", href]); }
    if (!isSvg && el.localName === "img") { const src = absolute(el.currentSrc || el.src || ""); if (/^https?:/i.test(src)) attrs.push(["src", src]); }
    if (!isSvg && el.localName === "form" && el.getAttribute("action")) removed("form action");
    return attrs;
  };
  const walk = (el, parentStyle, isRoot, inSvg) => {
    if (out.nodes >= args.maxNodes) { out.truncated = true; return null; }
    const tag = el.localName;
    const isSvg = inSvg || tag === "svg";
    if (!isSvg && SKIP.has(tag)) { removed(tag); return null; }
    if (isSvg && (tag === "script" || tag === "foreignobject" || tag === "foreignObject")) { removed(tag); return null; }
    if (isTracker(el)) { removed("tracking pixel"); return null; }
    out.nodes += 1;
    if (inSvg) {
      const kids = [];
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === 3) kids.push(child.nodeValue);
        else if (child.nodeType === 1) { const node = walk(child, null, false, true); if (node) kids.push(node); }
      }
      return { tag: el.tagName, svg: true, attrs: attrsOf(el, true), style: null, children: kids };
    }
    const { cs, style } = styleOf(el, parentStyle, isRoot);
    if (cs.display === "none") { out.nodes -= 1; return null; }
    if (isRoot && tag === "body" && (style["background-color"] === undefined || style["background-color"] === "rgba(0, 0, 0, 0)")) {
      const top = getComputedStyle(document.documentElement).getPropertyValue("background-color");
      if (top !== "rgba(0, 0, 0, 0)") style["background-color"] = top;
    }
    const kids = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) { const text = child.nodeValue.replace(/\s+/g, " "); if (text) kids.push(text); }
      else if (child.nodeType === 1) { const node = walk(child, cs, false, isSvg); if (node) kids.push(node); }
    }
    return { tag: isSvg ? "svg" : tag, svg: isSvg, attrs: attrsOf(el, isSvg), style, children: kids };
  };
  out.root = walk(root, root.parentElement ? getComputedStyle(root.parentElement) : null, true, false);
  const rect = root.getBoundingClientRect();
  out.width = Math.round(rect.width);
  out.height = Math.round(Math.max(rect.height, root === document.body ? document.documentElement.scrollHeight : 0));
  frame.remove();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules = null;
    try { rules = sheet.cssRules; } catch (error) { continue; }
    for (const rule of Array.from(rules || [])) {
      if (out.fontFaces.length >= args.maxFaces) break;
      if (rule.type !== 5) continue;
      const baseUrl = sheet.href || location.href;
      const text = rule.cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote, raw) => { try { return 'url("' + new URL(raw, baseUrl).href + '")'; } catch (error) { return match; } });
      out.fontFaces.push({ family: rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim(), css: text });
    }
  }
  out.families = Array.from(families);
  return out;
}`;

const toCollectScript = (
  selector: string | null,
  maxNodes: number,
  maxFaces: number
): string =>
  `(${COLLECT_BODY})(${JSON.stringify({ maxFaces, maxNodes, selector })})`;

export { toCollectScript as collectScript };
