import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/data/client";
import type { LetzmrStore } from "../domain/types";
import { isLetzmrLiveConfigured } from "../persist/config";
import { createSupabasePersistence } from "../persist/supabaseRepo";
import { PublicCategoryView } from "./PublicCategoryView";

/** Consulta pública somente leitura: abre sem login e só mostra categorias publicadas. */
export function LetzmrPublicPage() {
  const { tournamentId, categoryId, tournamentSlug, categorySlug } = useParams();
  const [remote, setRemote] = useState<LetzmrStore | null>(null);
  const [meta, setMeta] = useState<{
    tournamentName: string;
    categoryName: string;
    tournamentSlug: string;
    categorySlug: string;
    categoryId: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(silent: boolean) {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        if (!supabase || !isLetzmrLiveConfigured()) {
          throw new Error("Consulta indisponível no momento.");
        }
        const persist = createSupabasePersistence({
          client: supabase,
          getUserId: () => null,
        });
        const pub = categoryId
          ? await persist.loadPublicCategory(categoryId)
          : await persist.loadPublicCategoryBySlug(tournamentSlug!, categorySlug!);
        if (cancelled) return;
        if (pub) {
          setRemote(pub.snapshot);
          setMeta({
            tournamentName: pub.tournamentName,
            categoryName: pub.categoryName,
            tournamentSlug: pub.tournamentSlug,
            categorySlug: pub.categorySlug,
            categoryId: pub.categoryId,
          });
        } else {
          setRemote(null);
          setMeta(null);
        }
      } catch (e) {
        if (!cancelled && !silent) {
          setError(e instanceof Error ? e.message : "Erro ao carregar");
        }
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    }
    void load(false);
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [categoryId, tournamentSlug, categorySlug]);

  if (loading) return <p className="text-sm">Carregando…</p>;
  if (error) return <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>;

  if (!remote || !meta) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Categoria não publicada</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Os jogos desta categoria ainda não estão disponíveis. A consulta só abre depois que o
          organizador publica as chaves.
        </p>
      </div>
    );
  }

  const friendly = `/${meta.tournamentSlug}/${meta.categorySlug}`;
  if (categoryId && tournamentId) {
    return <Navigate to={friendly} replace />;
  }

  return (
    <div className="space-y-4">
      <Link
        to={`/${meta.tournamentSlug}`}
        className="text-sm text-[hsl(var(--muted-foreground))] hover:underline"
      >
        ← Todas as categorias do torneio
      </Link>
      <PublicCategoryView
        store={remote}
        categoryId={meta.categoryId}
        tournamentName={meta.tournamentName}
        categoryName={meta.categoryName}
      />
    </div>
  );
}
