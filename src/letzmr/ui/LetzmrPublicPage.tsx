import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createEngine } from "../store/engine";
import type { LetzmrStore } from "../domain/types";
import { getSession } from "../persist/session";
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
          A consulta pública só exibe categorias publicadas pelo organizador.
        </p>
        <Link to="/" className="text-sm underline">
          Início MRTorneio
        </Link>
      </div>
    );
  }

  const eng = createEngine(remote, { autoLocalPersist: false });
  const groups = remote.groups.filter((g) => g.categoryId === categoryId);
  const matches = remote.matches
    .filter((m) => m.categoryId === categoryId)
    .sort(
      (a, b) => a.phase.localeCompare(b.phase) || a.round - b.round || a.position - b.position,
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Consulta pública (somente leitura)
        </p>
        <h1 className="text-2xl font-bold">{meta.tournamentName}</h1>
        <p className="text-sm">{meta.categoryName}</p>
      </div>

      {groups.map((g) => {
        const { ranked } = eng.getGroupStandings(g.id);
        return (
          <section key={g.id}>
            <h2 className="mb-2 font-semibold">{g.label}</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {ranked.map((r) => (
                <li key={r.registrationId}>
                  {eng.regName(r.registrationId)} — {r.wins}V/{r.losses}D
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <section>
        <h2 className="mb-2 font-semibold">Jogos</h2>
        <ul className="space-y-2 text-sm">
          {matches.map((m) => (
            <li key={m.id} className="border-b border-[hsl(var(--border))] pb-2">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {m.phase} R{m.round}
              </span>
              <br />
              {m.placeholderA || eng.regName(m.sideAId)} vs{" "}
              {m.placeholderB || eng.regName(m.sideBId)}
              {m.winnerRegistrationId
                ? ` → ${eng.regName(m.winnerRegistrationId)}`
                : ` (${m.status})`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
