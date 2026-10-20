import { supabase } from "@/data/client";
import type { Engine } from "../store/engine";
import { resetEngine } from "../store/engine";
import { seedDemoTournament } from "../demo/seedDemo";
import { emptyStore } from "../store/localStore";
import { isLetzmrLiveConfigured, readStoredMode, writeStoredMode } from "./config";
import { clearDemoStore, createDemoPersistence } from "./demoStore";
import { createSupabasePersistence } from "./supabaseRepo";
import type { LetzmrMode, LetzmrPersistence, PersistResult } from "./types";

export type LetzmrSession = {
  mode: LetzmrMode;
  version: number;
  userId: string | null;
  persistence: LetzmrPersistence;
  status: "idle" | "loading" | "ready" | "error";
  lastError: string | null;
  liveConfigured: boolean;
};

let session: LetzmrSession = {
  mode: readStoredMode(),
  version: 0,
  userId: null,
  persistence: createDemoPersistence(),
  status: "idle",
  lastError: null,
  liveConfigured: isLetzmrLiveConfigured(),
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

function buildPersistence(mode: LetzmrMode, userId: string | null): LetzmrPersistence {
  if (mode === "demo") return createDemoPersistence();
  return createSupabasePersistence({
    client: supabase,
    getUserId: () => userId,
  });
}

export async function initLetzmrSession(userId: string | null): Promise<Engine> {
  session = {
    ...session,
    userId,
    liveConfigured: isLetzmrLiveConfigured(),
    status: "loading",
    lastError: null,
  };
  emit();

  const mode = session.mode === "live" && !session.liveConfigured ? "demo" : session.mode;
  if (mode !== session.mode) {
    session = { ...session, mode };
    writeStoredMode(mode);
  }

  if (mode === "live" && !userId) {
    session = {
      ...session,
      persistence: buildPersistence("live", null),
      status: "ready",
      version: 0,
      lastError: "Entre com sua conta para usar persistência Supabase.",
    };
    const eng = resetEngine(emptyStore(), { autoLocalPersist: false, organizerId: null });
    emit();
    return eng;
  }

  const persistence = buildPersistence(mode, userId);
  try {
    const { store, version } = await persistence.load();
    session = {
      ...session,
      persistence,
      version,
      status: "ready",
      lastError: null,
    };
    const eng = resetEngine(store, {
      autoLocalPersist: false,
      organizerId: mode === "live" ? userId : null,
    });
    emit();
    return eng;
  } catch (e) {
    session = {
      ...session,
      persistence,
      status: "error",
      lastError: e instanceof Error ? e.message : "Falha ao carregar LETZMR",
    };
    emit();
    return resetEngine(emptyStore(), {
      autoLocalPersist: false,
      organizerId: mode === "live" ? userId : null,
    });
  }
}

export async function setLetzmrMode(mode: LetzmrMode, userId: string | null): Promise<Engine> {
  writeStoredMode(mode);
  session = { ...session, mode };
  return initLetzmrSession(userId);
}

export async function persistAfterMutation(eng: Engine): Promise<PersistResult> {
  const { persistence, version, mode, userId } = session;
  if (mode === "live" && !userId) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Login obrigatório para gravar.",
    };
  }
  const store = eng.getStore();
  const result = await persistence.save(store, version);
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

export async function loadDemoIntoSession(): Promise<Engine> {
  writeStoredMode("demo");
  session = {
    ...session,
    mode: "demo",
    persistence: createDemoPersistence(),
    status: "ready",
    lastError: null,
  };
  const seeded = seedDemoTournament();
  const eng = resetEngine(seeded, { autoLocalPersist: false, organizerId: null });
  clearDemoStore();
  const persistence = createDemoPersistence();
  session = { ...session, persistence };
  const saved = await persistence.save(eng.getStore(), 0);
  session = {
    ...session,
    version: saved.ok ? saved.version : 1,
  };
  emit();
  return eng;
}

export async function clearDemoSession(): Promise<Engine> {
  clearDemoStore();
  writeStoredMode("demo");
  session = {
    ...session,
    mode: "demo",
    persistence: createDemoPersistence(),
    version: 0,
    status: "ready",
    lastError: null,
  };
  const eng = resetEngine(emptyStore(), { autoLocalPersist: false, organizerId: null });
  emit();
  return eng;
}

export async function reloadLive(userId: string | null): Promise<Engine> {
  return initLetzmrSession(userId);
}
