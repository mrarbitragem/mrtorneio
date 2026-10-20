import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getEngine, type Engine } from "../store/engine";
import type { LetzmrStore } from "../domain/types";
import {
  clearDemoSession,
  getSession,
  initLetzmrSession,
  loadDemoIntoSession,
  persistAfterMutation,
  reloadLive,
  setLetzmrMode,
  subscribeSession,
  syncPublishFlags,
  type LetzmrSession,
} from "../persist/session";
import type { LetzmrMode } from "../persist/types";

let storeListeners = new Set<() => void>();

function emitStore() {
  storeListeners.forEach((l) => l());
}

function subscribeStore(cb: () => void) {
  storeListeners.add(cb);
  return () => storeListeners.delete(cb);
}

function getStoreSnapshot(): LetzmrStore {
  return getEngine().getStore();
}

function getSessionSnapshot(): LetzmrSession {
  return getSession();
}

export function useLetzmrStore() {
  return useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
}

export function useLetzmrSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
}

export function useLetzmr() {
  const { user, loading: authLoading } = useAuth();
  const store = useLetzmrStore();
  const session = useLetzmrSession();

  useEffect(() => {
    if (authLoading) return;
    void initLetzmrSession(user?.id ?? null).then(() => emitStore());
  }, [user?.id, authLoading]);

  const run = useCallback(
    async <T,>(fn: (eng: Engine) => T): Promise<T> => {
      if (session.mode === "live" && !user?.id) {
        throw new Error("Login de organizador obrigatório para alterar dados reais.");
      }
      const eng = getEngine();
      if (session.mode === "live") eng.setOrganizerId(user!.id);
      const result = fn(eng);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) {
        throw new Error(persistResult.message);
      }
      emitStore();
      return result;
    },
    [session.mode, user],
  );

  const setMode = useCallback(
    async (mode: LetzmrMode) => {
      await setLetzmrMode(mode, user?.id ?? null);
      emitStore();
    },
    [user?.id],
  );

  const loadDemo = useCallback(async () => {
    await loadDemoIntoSession();
    emitStore();
  }, []);

  const hardReset = useCallback(async () => {
    if (session.mode === "live") {
      await reloadLive(user?.id ?? null);
    } else {
      await clearDemoSession();
    }
    emitStore();
  }, [session.mode, user?.id]);

  const publishCategory = useCallback(
    async (categoryId: string, published: boolean) => {
      const eng = getEngine();
      eng.setPublished(categoryId, published);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      const pub = await syncPublishFlags(eng, categoryId, published);
      if (pub.ok === false && session.mode === "live") throw new Error(pub.message);
      emitStore();
    },
    [session.mode],
  );

  const reload = useCallback(async () => {
    await reloadLive(user?.id ?? null);
    emitStore();
  }, [user?.id]);

  return {
    store,
    session,
    authLoading,
    user,
    run,
    setMode,
    loadDemo,
    hardReset,
    publishCategory,
    reload,
    eng: getEngine(),
  };
}
