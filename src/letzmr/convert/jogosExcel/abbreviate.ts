function normalize(value: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Dupla Masculina B" → "M B"; "Dupla Masculina Profissional" → "M PRO". */
export function abbreviateCategory(raw: string): string {
  const text = normalize(raw);
  if (!text) return "";
  let gender = "";
  if (/\bfeminina\b|\bfeminino\b/i.test(text)) gender = "F";
  else if (/\bmasculina\b|\bmasculino\b/i.test(text)) gender = "M";
  else if (/\bmista\b/i.test(text)) gender = "Mx";

  let rest = text
    .replace(/^dupla\s+/i, "")
    .replace(/^simples\s+/i, "")
    .replace(/\bmasculina\b|\bmasculino\b|\bfeminina\b|\bfeminino\b|\bmista\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  rest = rest
    .replace(/^profissional$/i, "PRO")
    .replace(/^pro$/i, "PRO")
    .replace(/^iniciante$/i, "INIC")
    .replace(/^sub[\s-]*(\d+)$/i, "S$1");

  return [gender, rest].filter(Boolean).join(" ");
}

/** "Fase de grupos - G1" → "G1"; "Quartas de Final" → "QF". */
export function abbreviatePhase(raw: string): string {
  const text = normalize(raw);
  if (!text) return "";
  const group = text.match(/\bG\s*(\d+)\b/i);
  if (group && /grupo/i.test(text)) return `G${group[1]}`;
  if (/^g\d+$/i.test(text)) return text.toUpperCase().replace(/\s+/g, "");
  if (/oitavas|r\s*16|16\s*avos/i.test(text)) return "R16";
  if (/quartas/i.test(text)) return "QF";
  if (/semi/i.test(text)) return "SF";
  if (/\bfinal\b/i.test(text)) return "F";
  if (/consola/i.test(text)) return "C";
  return text;
}

export function saidaExcelFilename(originalName: string): string {
  const base =
    String(originalName || "")
      .replace(/\\/g, "/")
      .split("/")
      .pop() || "Jogos.xlsx";
  const stem = base.replace(/\.xlsx?$/i, "").replace(/ \(\d+\)$/, "");
  if (!stem) return "Jogos saida.xlsx";
  if (/saida$/i.test(stem)) return `${stem}.xlsx`;
  if (/jogos$/i.test(stem)) return `${stem} saida.xlsx`;
  return `${stem} saida.xlsx`;
}
