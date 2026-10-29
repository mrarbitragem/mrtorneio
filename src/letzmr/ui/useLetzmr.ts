import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getEngine, type Engine } from "../store/engine";
import type { BracketSeeding, LetzmrStore } from "../domain/types";
import {
  getSession,
  initLetzmrSession,
  persistAfterMutation,
  reloadSession,
  subscribeSession,
  syncPublishFlags,
  type LetzmrSession,
} from "../persist/session";

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
      if (!user?.id) {
        throw new Error("Faça login para alterar os dados.");
      }
      const eng = getEngine();
      eng.setOrganizerId(user.id);
      const result = fn(eng);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) {
        throw new Error(persistResult.message);
      }
      emitStore();
      return result;
    },
    [user],
  );

  const publishCategory = useCallback(async (categoryId: string, published: boolean) => {
    const eng = getEngine();
    if (!published) {
      // Tirar do ar: primeiro no servidor. Se falhar, nada muda e o erro aparece.
      const pub = await syncPublishFlags(eng, categoryId, false);
      if (pub.ok === false) throw new Error(pub.message);
      eng.setPublished(categoryId, false);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      emitStore();
      return;
    }
    eng.setPublished(categoryId, true);
    const persistResult = await persistAfterMutation(eng);
    if (persistResult.ok === false) throw new Error(persistResult.message);
    const pub = await syncPublishFlags(eng, categoryId, true);
    if (pub.ok === false) throw new Error(pub.message);
    emitStore();
  }, []);

  const deleteTournament = useCallback(
    async (tournamentId: string) => {
      if (!user?.id) {
        throw new Error("Faça login para excluir dados.");
      }
      const eng = getEngine();
      // Despublica primeiro: se algo falhar, o torneio continua inteiro e consistente.
      const publishedIds = eng
        .getStore()
        .categories.filter((c) => c.tournamentId === tournamentId && c.published)
        .map((c) => c.id);
      for (const id of publishedIds) {
        const res = await syncPublishFlags(eng, id, false);
        if (res.ok === false) throw new Error(res.message);
      }
      eng.deleteTournament(tournamentId);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      emitStore();
    },
    [user?.id],
  );

  const requireUser = () => {
    if (!user?.id) throw new Error("Faça login para alterar os dados.");
    return user.id;
  };

  const categoryIsPublished = (eng: Engine, categoryId: string) =>
    eng.getStore().categories.some((c) => c.id === categoryId && c.published);

  /**
   * Operações que invalidam a página pública (apagar, limpar, mudar grupos): tira a consulta
   * do ar antes de mexer. Se a gravação falhar, a categoria continua inteira e consistente.
   */
  const deleteCategory = useCallback(
    async (categoryId: string) => {
      const uid = requireUser();
      const eng = getEngine();
      eng.setOrganizerId(uid);
      if (categoryIsPublished(eng, categoryId)) {
        const res = await syncPublishFlags(eng, categoryId, false);
        if (res.ok === false) throw new Error(res.message);
      }
      eng.deleteCategory(categoryId);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      emitStore();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );

  const clearCategory = useCallback(
    async (categoryId: string, opts: { removeRegistrations?: boolean } = {}) => {
      const uid = requireUser();
      const eng = getEngine();
      eng.setOrganizerId(uid);
      if (categoryIsPublished(eng, categoryId)) {
        const res = await syncPublishFlags(eng, categoryId, false);
        if (res.ok === false) throw new Error(res.message);
      }
      eng.clearCategory(categoryId, opts);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      emitStore();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );

  const configureCategory = useCallback(
    async (
      categoryId: string,
      cfg: { numGroups: number; advancersPerGroup: number; bracketSeeding?: BracketSeeding },
    ) => {
      const uid = requireUser();
      const eng = getEngine();
      eng.setOrganizerId(uid);
      const willDiscard = eng.hasDraw(categoryId);
      if (willDiscard && categoryIsPublished(eng, categoryId)) {
        const res = await syncPublishFlags(eng, categoryId, false);
        if (res.ok === false) throw new Error(res.message);
      }
      const result = eng.configureCategory(categoryId, cfg);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      emitStore();
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );

  /** Refaz o sorteio. Se a categoria está publicada, a consulta pública é atualizada. */
  const redrawCategory = useCallback(
    async (categoryId: string) => {
      const uid = requireUser();
      const eng = getEngine();
      eng.setOrganizerId(uid);
      const wasPublished = categoryIsPublished(eng, categoryId);
      eng.generateDraw(categoryId);
      const persistResult = await persistAfterMutation(eng);
      if (persistResult.ok === false) throw new Error(persistResult.message);
      if (wasPublished) {
        const res = await syncPublishFlags(eng, categoryId, true);
        if (res.ok === false) throw new Error(res.message);
      }
      emitStore();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );

  const reload = useCallback(async () => {
    await reloadSession(user?.id ?? null);
    emitStore();
  }, [user?.id]);

  return {
    store,
    session,
    authLoading,
    user,
    run,
    publishCategory,
    deleteTournament,
    deleteCategory,
    clearCategory,
    configureCategory,
    redrawCategory,
    reload,
    eng: getEngine(),
  };
}
