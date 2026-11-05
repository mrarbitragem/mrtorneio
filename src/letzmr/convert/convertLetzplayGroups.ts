import { analyzeLetzplayPages, categoryShortName, layoutGroupSheets } from "./analyzeLetzplay";
import { composeGroupsPdf } from "./composeGroupsPdf";
import { loadPdfText } from "./loadPdfText";
import { copyPdfBytes } from "./pdfBytes";

export type ConvertedGroupsPdf = {
  pdfBytes: Uint8Array;
  pageCount: number;
  categories: { title: string; shortName: string; groupCount: number }[];
};

export async function convertLetzplayGroupsPdf(
  sourceBytes: ArrayBuffer | Uint8Array,
): Promise<ConvertedGroupsPdf> {
  const sourceCopy = copyPdfBytes(sourceBytes);
  const pages = await loadPdfText(sourceCopy);
  if (!pages.length) {
    throw new Error("Este PDF não tem páginas.");
  }
  const analysis = analyzeLetzplayPages(pages);
  if (!analysis.categories.length) {
    throw new Error(
      "Não achei tabelas de grupo neste PDF. Envie a impressão Letzplay com um grupo e os jogos por folha.",
    );
  }
  const pageSize = { width: pages[0].width, height: pages[0].height };
  const sheets = layoutGroupSheets(analysis.categories, pageSize);
  const pdfBytes = await composeGroupsPdf(sourceCopy, sheets, pageSize);
  return {
    pdfBytes,
    pageCount: sheets.length,
    categories: analysis.categories.map((category) => ({
      title: category.title,
      shortName: categoryShortName(category.title),
      groupCount: category.groups.length,
    })),
  };
}
