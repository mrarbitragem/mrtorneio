import { supabase } from "@/data/client";
import type { Engine } from "../store/engine";
import { resetEngine } from "../store/engine";
import { emptyStore } from "../store/localStore";
import { isLetzmrLiveConfigured } from "./config";
import { createSupabasePersistence } from "./supabaseRepo";
import type { LetzmrPersistence, PersistResult } from "./types";

export type LetzmrSession = {
  version: number;
  userId: string | null;
  persistence: LetzmrPersistence;
  status: "idle" | "loading" | "ready" | "error";
  lastError: string | null;
  /** false quando as variáveis VITE_SUPABASE_* não estão configuradas. */
  configured: boolean;
};

const NOT_CONFIGURED =
  "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.";

/** Usada só quando o Supabase não está configurado: nada é gravado. */
function unavailablePersistence(): LetzmrPersistence {
  const fail = async (): Promise<PersistResult> => ({
    ok: false,
    code: "not_configured",
    message: NOT_CONFIGURED,
  });
  return {
    async load() {
      return { store: emptyStore(), version: 0 };
    },
    save: fail,
    publishCategory: fail,
    unpublishCategory: fail,
    async loadPublicCategory() {
      return null;
    },
  };
}

function buildPersistence(userId: string | null): LetzmrPersistence {
  if (!supabase || !isLetzmrLiveConfigured()) return unavailablePersistence();
  return createSupabasePersistence({ client: supabase, getUserId: () => userId });
}

let session: LetzmrSession = {
  version: 0,
  userId: null,
  persistence: unavailablePersistence(),
  status: "idle",
  lastError: null,
  configured: isLetzmrLiveConfigured(),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeSession(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSession(): LetzmrSession {
  return session;
}

export async function initLetzmrSession(userId: string | null): Promise<Engine> {
  const configured = isLetzmrLiveConfigured();
  session = { ...session, userId, configured, status: "loading", lastError: null };
  emit();

  if (!configured) {
    session = {
      ...session,
      persistence: unavailablePersistence(),
      status: "error",
      version: 0,
      lastError: NOT_CONFIGURED,
    };
    const eng = resetEngine(emptyStore(), { organizerId: null });
    emit();
    return eng;
  }

  // Sem login não há dados de organizador para carregar.
  if (!userId) {
    session = {
      ...session,
      persistence: buildPersistence(null),
      status: "ready",
      version: 0,
      lastError: null,
    };
    const eng = resetEngine(emptyStore(), { organizerId: null });
    emit();
    return eng;
  }

  const persistence = buildPersistence(userId);
  try {
    const { store, version } = await persistence.load();
    session = { ...session, persistence, version, status: "ready", lastError: null };
    const eng = resetEngine(store, { organizerId: userId });
    emit();
    return eng;
  } catch (e) {
    session = {
      ...session,
      persistence,
      status: "error",
      lastError: e instanceof Error ? e.message : "Falha ao carregar os dados",
    };
    emit();
    return resetEngine(emptyStore(), { organizerId: userId });
  }
}

export async function persistAfterMutation(eng: Engine): Promise<PersistResult> {
  const { persistence, version, userId } = session;
  if (!userId) {
    return { ok: false, code: "unauthorized", message: "Login obrigatório para gravar." };
  }
  const result = await persistence.save(eng.getStore(), version);
  if (result.ok === true) {
    session = { ...session, version: result.version, lastError: null };
  } else {
    session = { ...session, lastError: result.message };
  }
  emit();
  return result;
}

export async function syncPublishFlags(eng: Engine, categoryId: string, published: boolean) {
  const { persistence } = session;
  if (published) {
    return persistence.publishCategory(eng.getStore(), categoryId);
  }
  return persistence.unpublishCategory(categoryId);
}

export async function reloadSession(userId: string | null): Promise<Engine> {
  return initLetzmrSession(userId);
}
