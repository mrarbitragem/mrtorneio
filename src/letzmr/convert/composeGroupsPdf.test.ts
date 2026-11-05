import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { analyzeLetzplayPages, layoutGroupSheets } from "./analyzeLetzplay";
import { composeGroupsPdf } from "./composeGroupsPdf";
import type { PdfPageText } from "./types";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures/letzplay-sample-pages.json");
const samplePdf = join(process.cwd(), ".tmp-pdf/letzplay-sample.pdf");

describe("composeGroupsPdf", () => {
  it.skipIf(!existsSync(samplePdf))(
    "gera uma folha por categoria a partir do PDF Letzplay de exemplo",
    async () => {
      const sample = JSON.parse(readFileSync(fixturePath, "utf8")) as { pages: PdfPageText[] };
      const analysis = analyzeLetzplayPages(sample.pages);
      const pageSize = { width: sample.pages[0].width, height: sample.pages[0].height };
      const sheets = layoutGroupSheets(analysis.categories, pageSize);
      const pdfBytes = await composeGroupsPdf(readFileSync(samplePdf), sheets, pageSize);
      const out = await PDFDocument.load(pdfBytes);
      expect(out.getPageCount()).toBe(sheets.length);
      expect(out.getPage(0).getSize().width).toBeCloseTo(pageSize.width, 0);
      expect(sheets[0].placements.some((p) => p.kind === "when" && p.text)).toBe(true);
    },
  );
});
