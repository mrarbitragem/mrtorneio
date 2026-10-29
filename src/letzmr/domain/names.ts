/**
 * Caracteres invisíveis que vêm de copiar/colar (WhatsApp, notas, planilhas): marcas de
 * direção, espaços de largura zero, "word joiner" (U+2060), BOM, seletores de variação etc.
 */
const INVISIBLE =
  /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;

/** Limpa um nome: tira invisíveis, troca qualquer espaço por espaço comum e tira as pontas. */
export function cleanName(raw: string): string {
  return raw.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}
