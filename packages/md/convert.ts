import {existsSync} from "node:fs";
import {extname} from "node:path";
import {fileURLToPath} from "node:url";
import Tesseract, {createWorker} from "tesseract.js";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {createCanvas} from "@napi-rs/canvas";

const RENDER_SCALE = 2;

async function convertPdf(file: string): Promise<string> {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await Bun.file(file).arrayBuffer()),
    standardFontDataUrl,
  }).promise;
  const pages2 = await Promise.all(Array.from({length: doc.numPages}).map((_, i) => doc.getPage(i + 1)));
  const pages = await Promise.all(pages2.map(async (page, i) => {
    // Text-based page: extract its text layer. Page without a text layer
    // (scanned): embed the rendered page as an inline base64 image instead.
    let text = "";
    let lastY: number | null = null;
    for (const item of (await page.getTextContent()).items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && (Math.abs(y - lastY) > 3 || item.hasEOL)) {
        text += "\n";
      } else if (text) {
        text += " ";
      }
      text += item.str;
      lastY = y;
    }
    text = text.trim();
    if (!text) {
      const viewport = page.getViewport({scale: RENDER_SCALE});
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({
        canvasContext: canvas.getContext("2d") as any,
        viewport,
        canvasFactory: {
          create: (width: number, height: number) => {
            const canvas = createCanvas(width, height);
            return {canvas, context: canvas.getContext("2d") as any};
          },
          reset: (c: {canvas: {width: number; height: number}}, width: number, height: number) => {
            c.canvas.width = width;
            c.canvas.height = height;
          },
          destroy: (c: {canvas: {width: number; height: number}}) => {
            c.canvas.width = 0;
            c.canvas.height = 0;
          },
        },
      } as any).promise;
      const png = await canvas.encode("png");
      text = `![page ${i + 1}](data:image/png;base64,${Buffer.from(png).toString("base64")})`;
    }
    return text;
  }));
  return pages.map(page => page.split("\n").filter(line => line !== "").join("\n")).join("\n\n");
}

// Bun resolves tesseract.js's default workerPath through its global install cache,
// where dependencies like regenerator-runtime are unresolvable and the worker hangs,
// so point it at the local copy explicitly.
const workerPath = fileURLToPath(new URL("./node_modules/tesseract.js/src/worker-script/node/index.js", import.meta.url));
const langPath = "https://tessdata.projectnaptha.com/4.0.0_best";
const standardFontDataUrl = fileURLToPath(new URL("./node_modules/pdfjs-dist/standard_fonts/", import.meta.url));

export async function convertImage(file: string): Promise<string> {
  const worker = await createWorker("eng", 1, {workerPath, langPath});
  worker.setParameters({tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT, preserve_interword_spaces: "1"});
  try {
    return (await worker.recognize(file)).data.text;
  } finally {
    await worker.terminate();
  }
}

export async function convert(file: string): Promise<string> {
  if (!existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  const ext = extname(file);
  switch (ext) {
  case ".pdf":
    return convertPdf(file);
  case ".png":
    return convertImage(file);
  default:
    throw new Error(`Unknown file type ${ext}`);
  }
}
