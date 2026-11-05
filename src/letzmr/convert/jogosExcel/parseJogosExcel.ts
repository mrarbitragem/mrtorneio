import ExcelJS from "exceljs";
import type { JogosMatch } from "./types";

const HEADER_MAP: Record<string, keyof JogosMatch> = {
  DATA: "date",
  HORA: "time",
  CATEGORIA: "category",
  CAT: "category",
  FASE: "phase",
  "JOGADOR(ES) 01": "player1",
  "JOGADORES 01": "player1",
  "JOGADOR 01": "player1",
  "JOGADOR(ES) 02": "player2",
  "JOGADORES 02": "player2",
  "JOGADOR 02": "player2",
  RESULTADO: "result",
};

function headerKey(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cellText(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && value && "richText" in value) {
    const parts = (value as { richText: { text: string }[] }).richText;
    return parts.map((part) => part.text).join("");
  }
  return String(value).trim();
}

function findHeader(sheet: ExcelJS.Worksheet): { rowNumber: number; columns: Partial<Record<keyof JogosMatch, number>> } | null {
  const last = Math.min(20, Math.max(1, sheet.rowCount || 1));
  for (let n = 1; n <= last; n += 1) {
    const row = sheet.getRow(n);
    const columns: Partial<Record<keyof JogosMatch, number>> = {};
    row.eachCell((cell, col) => {
      const field = HEADER_MAP[headerKey(cell.value)];
      if (field && columns[field] == null) columns[field] = col;
    });
    if (columns.time && columns.category && columns.phase && columns.player1 && columns.player2) {
      return { rowNumber: row.number, columns };
    }
  }
  return null;
}

/** Lê a planilha Letzplay de jogos (uma linha por partida). */
export async function parseJogosExcel(data: ArrayBuffer | Uint8Array): Promise<JogosMatch[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Este Excel não tem planilha.");

  const header = findHeader(sheet);
  if (!header) {
    throw new Error(
      "Não achei as colunas de jogos. Envie o Excel Letzplay com HORA, CATEGORIA, FASE e JOGADOR(ES).",
    );
  }

  const matches: JogosMatch[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= header.rowNumber) return;
    const time = cellText(row.getCell(header.columns.time!).value);
    const category = cellText(row.getCell(header.columns.category!).value);
    const phase = cellText(row.getCell(header.columns.phase!).value);
    const player1 = cellText(row.getCell(header.columns.player1!).value);
    const player2 = cellText(row.getCell(header.columns.player2!).value);
    if (!player1 && !player2) return;
    const dateCell = header.columns.date ? row.getCell(header.columns.date).value : null;
    const result = header.columns.result ? cellText(row.getCell(header.columns.result).value) : "";
    matches.push({
      date: dateCell instanceof Date || typeof dateCell === "number" ? dateCell : dateCell ? cellText(dateCell) : null,
      time,
      category,
      phase,
      player1,
      player2,
      result,
    });
  });

  if (!matches.length) {
    throw new Error("Não achei partidas neste Excel.");
  }
  return matches;
}
