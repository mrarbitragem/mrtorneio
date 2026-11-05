import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { convertJogosExcel } from "./convertJogosExcel";

const samplePath = join(process.cwd(), ".tmp-pdf/letzplay-jogos.xlsx");

async function inputWorkbook(rows: string[][]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Jogos");
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

describe("convertJogosExcel", () => {
  it("monta a folha de saída com CAT/FASE curtos e células mescladas", async () => {
    const source = await inputWorkbook([
      ["DATA", "HORA", "CATEGORIA", "FASE", "JOGADOR(ES) 01", "JOGADOR(ES) 02"],
      ["2026-10-17", "09:00h", "Dupla Masculina B", "Fase de grupos - G1", "Carlindo / Wilson", "Antônio / João"],
      ["2026-10-17", "09:00h", "Dupla Masculina B", "Fase de grupos - G1", "Antônio / João", "Antonio / Ivan"],
      ["2026-10-17", "09:00h", "Dupla Masculina B", "Fase de grupos - G1", "Antonio / Ivan", "Carlindo / Wilson"],
      ["2026-10-17", "10:30h", "Dupla Feminina C", "Fase de grupos - G2", "Katarina / Patrícia", "Ellen / Paula"],
    ]);
    const converted = await convertJogosExcel(source, "FBT - Jogos.xlsx");
    expect(converted.filename).toBe("FBT - Jogos saida.xlsx");
    expect(converted.matchCount).toBe(4);
    expect(converted.blockCount).toBe(2);

    const out = new ExcelJS.Workbook();
    await out.xlsx.load(converted.xlsxBytes as ExcelJS.Buffer);
    const sheet = out.worksheets[0];
    expect(sheet.getRow(1).getCell(3).value).toBe("CAT");
    expect(sheet.getRow(2).getCell(3).value).toBe("M B");
    expect(sheet.getRow(2).getCell(4).value).toBe("G1");
    expect(sheet.getRow(5).getCell(3).value).toBe("F C");
    expect(sheet.getRow(5).getCell(4).value).toBe("G2");
    expect(sheet.getColumn(5).width).toBe(40);
    expect(sheet.getColumn(6).width).toBe(40);
    const merges = [...sheet.model.merges];
    expect(merges).toContain("B2:B4");
    expect(merges).toContain("C2:C4");
    expect(merges).toContain("D2:D4");
  });

  it.skipIf(!existsSync(samplePath))("converte o Excel Letzplay de exemplo", async () => {
    const converted = await convertJogosExcel(readFileSync(samplePath), "Jogos.xlsx");
    expect(converted.matchCount).toBeGreaterThan(10);
    expect(converted.blockCount).toBeGreaterThan(1);
  });
});
