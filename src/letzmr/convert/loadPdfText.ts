import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { copyPdfBytes } from "./pdfBytes";
import type { PdfPageText, PdfTextItem } from "./types";

function runningInBrowser(): boolean {
  return typeof window !== "undefined" && !/jsdom/i.test(window.navigator?.userAgent ?? "");
}

function ensurePdfWorker() {
  if (!runningInBrowser()) return;
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

/** Extrai texto com posição (origem no topo) para achar GRUPO / JOGOS / título. */
export async function loadPdfText(data: ArrayBuffer | Uint8Array): Promise<PdfPageText[]> {
  ensurePdfWorker();
  const bytes = copyPdfBytes(data);
  const loadingTask = getDocument({
    data: bytes,
    disableWorker: !runningInBrowser(),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  try {
    const pages: PdfPageText[] = [];
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || !raw.str) continue;
        const str = String(raw.str).replace(/\s+/g, " ").trim();
        if (!str) continue;
        const x = raw.transform[4];
        const yPdf = raw.transform[5];
        const height = Math.abs(raw.height) || 0;
        items.push({
          str,
          x,
          y: viewport.height - yPdf - height,
          width: raw.width,
          height,
          fontSize: height || 10,
        });
      }
      pages.push({ width: viewport.width, height: viewport.height, items });
    }
    return pages;
  } finally {
    await pdf.destroy();
  }
}
