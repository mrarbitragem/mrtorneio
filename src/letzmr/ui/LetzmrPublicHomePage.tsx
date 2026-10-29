import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/data/client";
import { isLetzmrLiveConfigured } from "../persist/config";
import { createSupabasePersistence } from "../persist/supabaseRepo";
import type { PublicTournamentSummary } from "../persist/types";

const REFRESH_MS = 60_000;

/** Página inicial: torneios com categorias publicadas, abertos a qualquer pessoa. */
export function LetzmrPublicHomePage() {
  const [tournaments, setTournaments] = useState<PublicTournamentSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!supabase || !isLetzmrLiveConfigured()) {
          throw new Error("Consulta indisponível no momento.");
        }
        const list = await createSupabasePersistence({
          client: supabase,
          getUserId: () => null,
        }).listPublicTournaments();
        if (cancelled) return;
        setTournaments(list);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="public-home">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Torneios</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Escolha um torneio para ver grupos, chaves, jogos e horários.
        </p>
      </section>

      {error && !tournaments && (
        <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
      )}
      {!error && !tournaments && <p className="text-sm">Carregando…</p>}

      {tournaments && tournaments.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Nenhum torneio disponível no momento.
        </p>
      )}

      {tournaments && tournaments.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="public-tournaments">
          {tournaments.map((t) => (
            <li
              key={t.tournamentId}
              className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-white p-4 shadow-sm"
            >
              <div>
                <Link
                  to={`/public/${t.tournamentId}`}
                  className="text-lg font-semibold text-[hsl(var(--primary))] hover:underline"
                  data-testid="public-tournament-link"
                >
                  {t.tournamentName}
                </Link>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t.categories.length} categoria(s) · atualizado{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  }).format(new Date(t.updatedAt))}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {t.categories.map((c) => (
                  <Link
                    key={c.categoryId}
                    to={`/public/${t.tournamentId}/${c.categoryId}`}
                    className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs hover:bg-[hsl(var(--muted))]"
                  >
                    {c.categoryName}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
