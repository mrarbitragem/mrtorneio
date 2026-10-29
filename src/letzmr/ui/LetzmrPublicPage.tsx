import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/data/client";
import type { LetzmrStore } from "../domain/types";
import { isLetzmrLiveConfigured } from "../persist/config";
import { createSupabasePersistence } from "../persist/supabaseRepo";
import { PublicCategoryView } from "./PublicCategoryView";

/** Consulta pública somente leitura: abre sem login e só mostra categorias publicadas. */
export function LetzmrPublicPage() {
  const { categoryId } = useParams();
  const [remote, setRemote] = useState<LetzmrStore | null>(null);
  const [meta, setMeta] = useState<{ tournamentName: string; categoryName: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (!supabase || !isLetzmrLiveConfigured()) {
          throw new Error("Consulta indisponível no momento.");
        }
        const pub = await createSupabasePersistence({
          client: supabase,
          getUserId: () => null,
        }).loadPublicCategory(categoryId!);
        if (cancelled) return;
        if (pub) {
          setRemote(pub.snapshot);
          setMeta({ tournamentName: pub.tournamentName, categoryName: pub.categoryName });
        } else {
          setRemote(null);
          setMeta(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

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

  return (
    <PublicCategoryView
      store={remote}
      categoryId={categoryId!}
      tournamentName={meta.tournamentName}
      categoryName={meta.categoryName}
    />
  );
}
