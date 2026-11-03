interface RawCell {
  readonly contrast: number | null;
  readonly error: string | null;
  readonly id: string;
  readonly large: boolean;
}

interface RawGalleryProbe {
  readonly cells: readonly RawCell[];
}

const CONTRAST_NORMAL = 4.5;

const CONTRAST_LARGE = 3;

const GALLERY_PROBE = String.raw`(async () => {
  for (let at = 0; at < 60 && !window.__galleryReady; at += 1) await new Promise((resolve) => setTimeout(resolve, 100));
  const errors = window.__studioGalleryErrors || {};
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const pen = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (value) => {
    pen.clearRect(0, 0, 1, 1);
    pen.fillStyle = '#000';
    pen.fillStyle = value;
    pen.fillRect(0, 0, 1, 1);
    const data = pen.getImageData(0, 0, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
  };
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const backdrop = (element) => {
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const color = rgba(getComputedStyle(node).backgroundColor);
      if (color.a > 0) layers.push(color);
      if (color.a >= 1) break;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let at = layers.length - 1; at >= 0; at -= 1) base = over(layers[at], base);
    return base;
  };
  const channel = (value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : Math.pow((unit + 0.055) / 1.055, 2.4);
  };
  const luminance = (color) => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  const textElement = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent.trim() !== '' && node.parentElement) return node.parentElement;
    }
    return null;
  };
  const cells = [];
  for (const cell of document.querySelectorAll('.g-cell[data-cell]')) {
    const id = cell.getAttribute('data-cell');
    const host = cell.firstElementChild;
    const first = host && host.firstElementChild;
    let error = errors[id] || null;
    if (!error && !first && !(host && host.textContent.trim())) error = 'The cell renders nothing.';
    let contrast = null;
    let large = false;
    const text = host ? textElement(host) : null;
    if (text) {
      const style = getComputedStyle(text);
      const fill = backdrop(text);
      const color = over(rgba(style.color), fill);
      const high = Math.max(luminance(color), luminance(fill));
      const low = Math.min(luminance(color), luminance(fill));
      contrast = Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100;
      const size = parseFloat(style.fontSize);
      large = size >= 24 || (size >= 18.66 && parseInt(style.fontWeight, 10) >= 700);
    }
    cells.push({ id, error, contrast, large });
  }
  return { cells };
})()`;

export { CONTRAST_LARGE, CONTRAST_NORMAL, GALLERY_PROBE };

export type { RawCell, RawGalleryProbe };
