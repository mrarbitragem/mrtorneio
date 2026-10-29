import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/data/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatScheduleWhen,
  describeMatchResult,
  groupPhaseLabel,
  knockoutRoundTitle,
} from "../domain/publicDraw";
import { isLetzmrLiveConfigured } from "../persist/config";
import { createSupabasePersistence } from "../persist/supabaseRepo";
import type { PublicCategorySnapshot } from "../persist/types";
import { createEngine } from "../store/engine";

const REFRESH_MS = 30_000;

type AgendaItem = {
  key: string;
  scheduledAt: string;
  court: string;
  categoryId: string;
  categoryName: string;
  phase: string;
  left: string;
  right: string;
  result: string;
};

function buildAgenda(snaps: PublicCategorySnapshot[]): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const snap of snaps) {
    const eng = createEngine(snap.snapshot);
    const store = snap.snapshot;
    const catMatches = store.matches.filter((m) => m.categoryId === snap.categoryId);
    for (const m of catMatches) {
      if (!m.scheduledAt || m.status === "bye") continue;
      const group = store.groups.find((g) => g.id === m.groupId);
      const koSize = catMatches.filter((x) => x.phase === "KO" && x.round === m.round).length;
      items.push({
        key: `${snap.categoryId}:${m.id}`,
        scheduledAt: m.scheduledAt,
        court: m.court ?? "",
        categoryId: snap.categoryId,
        categoryName: snap.categoryName,
        phase: m.phase === "GROUP" ? groupPhaseLabel(group) : knockoutRoundTitle(koSize),
        left: m.sideAId ? eng.regName(m.sideAId) : (m.placeholderA ?? "A definir"),
        right: m.sideBId ? eng.regName(m.sideBId) : (m.placeholderB ?? "A definir"),
        result: describeMatchResult(m, (id) => eng.regName(id)) ?? "",
      });
    }
  }
  return items.sort(
    (a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt) ||
      a.court.localeCompare(b.court) ||
      a.categoryName.localeCompare(b.categoryName),
  );
}

/** Página pública do torneio: categorias publicadas e agenda geral. Sem login. */
export function LetzmrPublicTournamentPage() {
  const { tournamentId } = useParams();
  const [snaps, setSnaps] = useState<PublicCategorySnapshot[] | null>(null);
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
        }).loadPublicTournament(tournamentId!);
        if (cancelled) return;
        setSnaps(list);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    }
    void load();
    // Atualiza sozinho para quem deixa a página aberta durante o torneio.
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tournamentId]);

  const agenda = useMemo(() => (snaps ? buildAgenda(snaps) : []), [snaps]);

  if (error && !snaps) return <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>;
  if (!snaps) return <p className="text-sm">Carregando…</p>;

  if (snaps.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Torneio sem categorias publicadas</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Os jogos aparecem aqui assim que o organizador publicar as chaves.
        </p>
      </div>
    );
  }

  const tournamentName = snaps[0].tournamentName;
  const agendaSlots = new Map<string, AgendaItem[]>();
  for (const item of agenda) {
    const key = `${formatScheduleWhen(item.scheduledAt)}||${item.court}`;
    agendaSlots.set(key, [...(agendaSlots.get(key) ?? []), item]);
  }

  return (
    <div className="space-y-6" data-testid="public-tournament">
      <div>
        <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Consulta pública
        </p>
        <h1 className="text-2xl font-bold">{tournamentName}</h1>
      </div>

      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="agenda">Jogos e horários</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias">
          <ul className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))]">
            {snaps.map((s) => (
              <li key={s.categoryId}>
                <Link
                  to={`/public/${s.tournamentId}/${s.categoryId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[hsl(var(--muted))]"
                  data-testid="public-category-link"
                >
                  <span className="font-medium">{s.categoryName}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    atualizado{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(s.publishedAt))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="agenda" className="space-y-6">
          {agendaSlots.size === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Os horários ainda não foram divulgados.
            </p>
          ) : (
            [...agendaSlots.entries()].map(([key, items]) => {
              const [when, court] = key.split("||");
              return (
                <section key={key} data-testid="agenda-slot">
                  <h2 className="text-sm font-semibold">
                    {when}
                    {court ? ` · ${court}` : ""}
                  </h2>
                  {items.map((it) => (
                    <article
                      key={it.key}
                      className="border-b border-[hsl(var(--border))] py-3 text-sm"
                    >
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        <Link
                          to={`/public/${tournamentId}/${it.categoryId}`}
                          className="underline"
                        >
                          {it.categoryName}
                        </Link>{" "}
                        · {it.phase}
                      </p>
                      <p className="mt-1">
                        {it.left} <span className="text-[hsl(var(--muted-foreground))]">×</span>{" "}
                        {it.right}
                      </p>
                      {it.result && <p className="mt-1 font-medium">{it.result}</p>}
                    </article>
                  ))}
                </section>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
