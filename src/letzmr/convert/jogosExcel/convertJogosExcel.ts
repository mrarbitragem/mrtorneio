import { saidaExcelFilename } from "./abbreviate";
import { buildSaidaWorkbook } from "./buildSaidaWorkbook";
import { parseJogosExcel } from "./parseJogosExcel";
import type { ConvertedJogosExcel } from "./types";

export async function convertJogosExcel(
  sourceBytes: ArrayBuffer | Uint8Array,
  originalName = "Jogos.xlsx",
): Promise<ConvertedJogosExcel> {
  const matches = await parseJogosExcel(sourceBytes);
  const { xlsxBytes, blockCount } = await buildSaidaWorkbook(matches);
  return {
    xlsxBytes,
    matchCount: matches.length,
    blockCount,
    filename: saidaExcelFilename(originalName),
  };
}

export type { ConvertedJogosExcel } from "./types";
