export type EntryType = "singles" | "doubles";

export interface RegistrationListError {
  /** Número da linha no texto colado (começa em 1, contando linhas em branco). */
  line: number;
  text: string;
  message: string;
}

export interface ParsedRegistrationList {
  /** Cada item é a lista de nomes de uma inscrição (2 nomes em dupla, 1 em simples). */
  entries: string[][];
  errors: RegistrationListError[];
  /** Nomes que aparecem mais de uma vez na lista (aviso, não bloqueia: pode haver homônimos). */
  repeatedNames: string[];
}

/** Tira a numeração do começo: "1. ", "2) ", "3 - ", "4 ". */
const LEADING_NUMBER = /^\s*\d+(?:\s*[.)\-–:]\s*|\s+)/;

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Lê uma lista de inscrições, uma por linha, ex.:
 *   1. Dilma / Sueli
 *   2. Gisele / Bia
 * O separador entre os atletas é obrigatoriamente "/". Em dupla são exatamente 2 nomes;
 * em simples, 1 nome (sem "/"). Linhas em branco são ignoradas.
 */
export function parseRegistrationList(text: string, entryType: EntryType): ParsedRegistrationList {
  const entries: string[][] = [];
  const errors: RegistrationListError[] = [];
  const seen = new Map<string, number>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const original = rawLine.trim();
    if (!original) return;
    const line = index + 1;
    const body = original.replace(LEADING_NUMBER, "");
    const names = body.split("/").map(cleanName);

    if (entryType === "doubles") {
      if (names.length !== 2) {
        errors.push({
          line,
          text: original,
          message:
            names.length === 1
              ? "Dupla precisa de 2 nomes separados por / (só encontrei 1)."
              : `Dupla precisa de exatamente 2 nomes separados por / (encontrei ${names.length}).`,
        });
        return;
      }
      if (names.some((n) => !n)) {
        errors.push({ line, text: original, message: "Falta o nome de um dos atletas da dupla." });
        return;
      }
      if (names[0].toLowerCase() === names[1].toLowerCase()) {
        errors.push({ line, text: original, message: "Os dois atletas da dupla têm o mesmo nome." });
        return;
      }
    } else {
      if (names.length !== 1) {
        errors.push({
          line,
          text: original,
          message: "Categoria de simples: um nome por linha, sem / .",
        });
        return;
      }
      if (!names[0]) {
        errors.push({ line, text: original, message: "Nome vazio." });
        return;
      }
    }

    names.forEach((n) => {
      const key = n.toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    entries.push(names);
  });

  const repeatedNames = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => {
      // devolve a grafia original da primeira ocorrência
      const found = entries.flat().find((n) => n.toLowerCase() === key);
      return found ?? key;
    });

  return { entries, errors, repeatedNames };
}
