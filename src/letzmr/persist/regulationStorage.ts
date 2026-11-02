import type { SupabaseClient } from "@supabase/supabase-js";
import type { TournamentRegulation } from "../domain/types";

export const REGULATION_BUCKET = "letzmr-regulations";
export const REGULATION_MAX_BYTES = 10 * 1024 * 1024;
export const REGULATION_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/** Nome seguro para o caminho no Storage (sem acento, espaço ou símbolo). */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const b = clean(base) || "regulamento";
  const e = clean(ext);
  return e ? `${b}.${e}` : b;
}

/** Valida o arquivo antes de enviar; devolve a mensagem de erro ou null. */
export function validateRegulationFile(file: { type: string; size: number }): string | null {
  if (!REGULATION_MIME.includes(file.type)) {
    return "Envie um PDF ou uma imagem (PNG, JPG ou WEBP).";
  }
  if (file.size > REGULATION_MAX_BYTES) {
    return "Arquivo muito grande: o limite é 10 MB.";
  }
  return null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function uploadRegulationFile(args: {
  client: SupabaseClient;
  userId: string;
  tournamentId: string;
  file: File;
}): Promise<TournamentRegulation> {
  const { client, userId, tournamentId, file } = args;
  const invalid = validateRegulationFile(file);
  if (invalid) throw new Error(invalid);
  const path = `${userId}/${tournamentId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await client.storage
    .from(REGULATION_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw new Error(
      `Não foi possível enviar o arquivo: ${error.message}. ` +
        "Confirme que o script do regulamento foi executado no Supabase.",
    );
  }
  const { data } = client.storage.from(REGULATION_BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    name: file.name,
    storagePath: path,
    updatedAt: new Date().toISOString(),
  };
}

/** Apaga o arquivo antigo; falha silenciosa (o arquivo sobrando não afeta ninguém). */
export async function removeRegulationFile(client: SupabaseClient, storagePath?: string) {
  if (!storagePath) return;
  await client.storage.from(REGULATION_BUCKET).remove([storagePath]);
}
