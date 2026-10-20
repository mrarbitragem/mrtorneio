import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { LetzmrStore } from "../domain/types";
import { getSession } from "../persist/session";
import { PublicCategoryView } from "./PublicCategoryView";
import { useLetzmr } from "./useLetzmr";

/** Consulta pública read-only — só categorias publicadas. */
export function LetzmrPublicPage() {
  const { tournamentId, categoryId } = useParams();
  const { store: localStore, session } = useLetzmr();
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
        const pub = await getSession().persistence.loadPublicCategory(categoryId!);
        if (cancelled) return;
        if (pub) {
          setRemote(pub.snapshot);
          setMeta({
            tournamentName: pub.tournamentName,
            categoryName: pub.categoryName,
          });
        } else if (session.mode === "demo") {
          // fallback demo local
          const cat = localStore.categories.find((c) => c.id === categoryId && c.published);
          const t = localStore.tournaments.find((x) => x.id === tournamentId);
          if (cat && t) {
            setRemote(localStore);
            setMeta({ tournamentName: t.name, categoryName: cat.name });
          } else {
            setRemote(null);
            setMeta(null);
          }
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
  }, [categoryId, tournamentId, session.mode, localStore]);

  if (loading) return <p className="text-sm">Carregando consulta pública…</p>;
  if (error) return <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>;

  if (!remote || !meta) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Categoria não publicada</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Os jogos deste torneio ainda não estão disponíveis. A consulta pública só abre depois
          que o organizador publica as chaves.
        </p>
        <Link to="/" className="text-sm underline">
          Início MRTorneio
        </Link>
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
