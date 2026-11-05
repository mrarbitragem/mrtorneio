import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { convertLetzplayGroupsPdf } from "./convertLetzplayGroups";

const samplePdf = join(process.cwd(), ".tmp-pdf/letzplay-sample.pdf");

describe("convertLetzplayGroupsPdf", () => {
  it.skipIf(!existsSync(samplePdf))("converte o PDF Letzplay de exemplo em 6 folhas de grupo", async () => {
    const nodeBuf = readFileSync(samplePdf);
    const asArrayBuffer = nodeBuf.buffer.slice(
      nodeBuf.byteOffset,
      nodeBuf.byteOffset + nodeBuf.byteLength,
    );
    const converted = await convertLetzplayGroupsPdf(asArrayBuffer);
    expect(converted.pageCount).toBeGreaterThanOrEqual(6);
    expect(converted.categories.map((c) => c.shortName)).toEqual([
      "Dupla Masculina B",
      "Dupla Feminina C",
      "Dupla Masculina C",
      "Dupla Masculina A",
      "Dupla Feminina A",
      "Dupla Feminina B",
    ]);
    const out = await PDFDocument.load(converted.pdfBytes);
    expect(out.getPageCount()).toBe(converted.pageCount);
  });
});
