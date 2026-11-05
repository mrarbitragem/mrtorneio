import ExcelJS from "exceljs";
import { abbreviateCategory, abbreviatePhase } from "./abbreviate";
import type { JogosMatch, SaidaMatch } from "./types";

const HEADER = ["DATA", "HORA", "CAT", "FASE", "JOGADOR(ES) 01", "JOGADOR(ES) 02", "RESULTADO"] as const;
const BLUE = "FF0082C8";
const WHITE = "FFFFFFFF";
const BLACK = "FF000000";

const thin: ExcelJS.BorderStyle = "thin";
const medium: ExcelJS.BorderStyle = "medium";

function border(top: ExcelJS.BorderStyle, right: ExcelJS.BorderStyle, bottom: ExcelJS.BorderStyle, left: ExcelJS.BorderStyle): Partial<ExcelJS.Borders> {
  const edge = (style: ExcelJS.BorderStyle): ExcelJS.Border => ({ style, color: { argb: BLACK } });
  return { top: edge(top), right: edge(right), bottom: edge(bottom), left: edge(left) };
}

export function toSaidaMatches(matches: JogosMatch[]): SaidaMatch[] {
  return matches.map((match) => ({
    date: match.date,
    time: match.time,
    category: abbreviateCategory(match.category),
    phase: abbreviatePhase(match.phase),
    player1: match.player1,
    player2: match.player2,
    result: match.result,
  }));
}

function blockKey(match: SaidaMatch): string {
  const date =
    match.date instanceof Date
      ? match.date.toISOString().slice(0, 10)
      : String(match.date ?? "");
  return `${date}|${match.time}|${match.category}|${match.phase}`;
}

/** Intervalos 0-based de linhas consecutivas com o mesmo horário + categoria + fase. */
export function mergeBlocks(matches: SaidaMatch[]): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 1; i <= matches.length; i += 1) {
    if (i < matches.length && blockKey(matches[i]) === blockKey(matches[start])) continue;
    blocks.push({ start, end: i - 1 });
    start = i;
  }
  return blocks;
}

function applyHeader(cell: ExcelJS.Cell) {
  cell.font = { name: "Arial", size: 9, bold: true, color: { argb: WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function applyMeta(cell: ExcelJS.Cell, horizontal: ExcelJS.Alignment["horizontal"] = "center") {
  cell.font = { name: "Arial", size: 10 };
  cell.alignment = { vertical: "middle", horizontal, wrapText: true };
}

function applyPlayer(cell: ExcelJS.Cell) {
  cell.font = { name: "Arial", size: 18 };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

/** Monta a folha de saída no visual da impressão (cabeçalho azul, merges, nomes grandes). */
export async function buildSaidaWorkbook(matches: JogosMatch[]): Promise<{
  xlsxBytes: Uint8Array;
  blockCount: number;
}> {
  const rows = toSaidaMatches(matches);
  const blocks = mergeBlocks(rows);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MRTorneio";
  const sheet = workbook.addWorksheet("Jogos", {
    views: [{ state: "normal", showGridLines: false, zoomScale: 80 }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printTitlesRow: "1:1",
    },
    properties: { defaultRowHeight: 30 },
  });
  sheet.pageSetup.printArea = `B1:G${rows.length + 1}`;

  sheet.columns = [
    { key: "date", width: 12, hidden: true },
    { key: "time", width: 8 },
    { key: "category", width: 9 },
    { key: "phase", width: 9 },
    { key: "player1", width: 40 },
    { key: "player2", width: 40 },
    { key: "result", width: 16 },
  ];

  const headerRow = sheet.addRow([...HEADER]);
  headerRow.height = 30;
  headerRow.eachCell((cell) => applyHeader(cell));

  rows.forEach((match) => {
    const row = sheet.addRow([
      match.date,
      match.time,
      match.category,
      match.phase,
      match.player1,
      match.player2,
      match.result,
    ]);
    row.height = 30;
    if (match.date instanceof Date) row.getCell(1).numFmt = "dd/mm/yyyy";
    applyMeta(row.getCell(1), "left");
    applyMeta(row.getCell(2));
    applyMeta(row.getCell(3));
    applyMeta(row.getCell(4));
    applyPlayer(row.getCell(5));
    applyPlayer(row.getCell(6));
    applyMeta(row.getCell(7), "left");
  });

  const last = rows.length + 1;
  for (let r = 2; r <= last; r += 1) {
    const isFirst = r === 2;
    const isLast = r === last;
    for (let c = 2; c <= 7; c += 1) {
      const left = c === 2 ? medium : thin;
      const right = c === 7 ? medium : thin;
      const top = isFirst ? medium : thin;
      const bottom = isLast ? medium : thin;
      sheet.getRow(r).getCell(c).border = border(top, right, bottom, left);
    }
  }

  for (const block of blocks) {
    const start = block.start + 2;
    const end = block.end + 2;
    if (end > start) {
      sheet.mergeCells(start, 2, end, 2);
      sheet.mergeCells(start, 3, end, 3);
      sheet.mergeCells(start, 4, end, 4);
    }
  }

  sheet.getColumn(1).hidden = true;
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 8;
  sheet.getColumn(3).width = 9;
  sheet.getColumn(4).width = 9;
  sheet.getColumn(5).width = 40;
  sheet.getColumn(6).width = 40;
  sheet.getColumn(7).width = 16;
  const buffer = await workbook.xlsx.writeBuffer();
  return { xlsxBytes: new Uint8Array(buffer as ArrayBuffer), blockCount: blocks.length };
}
