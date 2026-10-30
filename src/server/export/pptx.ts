import type PptxGenJS from 'pptxgenjs';
import { ShapeWriter } from './pptx-shapes.js';
import { addBlock, textBlocks, type Slide } from './pptx-text.js';
import { patchDeck, type XmlPatch } from './pptx-xml.js';
import type { VectorRegion } from './vector.js';

const PX_PER_IN = 96;
const MAX_SIDE_IN = 56;

export interface PptxResult {
  bytes: Buffer;
  slides: number;
  textBoxes: number;
  shapes: number;
  pictures: number;
}

interface Layer {
  z: number;
  draw: () => void;
}

function layersOf(slide: Slide, region: VectorRegion, k: number, writer: ShapeWriter): { layers: Layer[]; texts: number } {
  const blocks = textBlocks(region.scan);
  const layers: Layer[] = [
    ...(region.native?.shapes ?? []).map(({ z, shape }) => ({ z, draw: () => writer.add(shape) })),
    ...blocks.map(({ z, segments }) => ({ z, draw: () => addBlock(slide, segments, k) })),
  ];
  return { layers: layers.sort((a, b) => a.z - b.z), texts: blocks.length };
}

export async function buildPptx(regions: VectorRegion[], title: string): Promise<PptxResult> {
  const { default: Pptx } = await import('pptxgenjs');
  const pptx = new Pptx();
  const [first] = regions;
  if (!first) throw new Error('nothing to export');
  const fit = Math.min(1, MAX_SIDE_IN / Math.max(first.scan.width / PX_PER_IN, first.scan.height / PX_PER_IN));
  const width = (first.scan.width / PX_PER_IN) * fit;
  const height = (first.scan.height / PX_PER_IN) * fit;
  pptx.defineLayout({ name: 'STUDIO', width, height });
  pptx.layout = 'STUDIO';
  pptx.title = title;
  pptx.company = 'Design Studio';
  const patches = new Map<string, XmlPatch>();
  const total = { textBoxes: 0, shapes: 0, pictures: 0 };
  for (const region of regions) {
    const slide = pptx.addSlide();
    const k = (width * PX_PER_IN) / region.scan.width;
    const imageHeight = (region.scan.height * k) / PX_PER_IN;
    const data = `image/png;base64,${region.png.toString('base64')}`;
    if (region.scan.background) slide.background = { color: region.scan.background.hex.toUpperCase() };
    if (Math.abs(imageHeight - height) / height < 0.01) slide.background = { data };
    else slide.addImage({ data, x: 0, y: 0, w: width, h: imageHeight });
    const writer = new ShapeWriter(slide, region, k, patches);
    const { layers, texts } = layersOf(slide, region, k, writer);
    for (const layer of layers) layer.draw();
    total.shapes += writer.count.shapes;
    total.pictures += writer.count.pictures;
    total.textBoxes += writer.count.texts + texts;
  }
  const raw = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  return { bytes: await patchDeck(raw, patches), slides: regions.length, ...total };
}
