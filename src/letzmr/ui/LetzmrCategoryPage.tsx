import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CorrectionImpact, Match, ScheduleConflict } from "../domain/types";
import { useLetzmr } from "./useLetzmr";

export function LetzmrCategoryPage() {
  const { tournamentId, categoryId } = useParams();
  const { store, run, eng, publishCategory } = useLetzmr();
  const cat = store.categories.find((c) => c.id === categoryId);
  const tournament = store.tournaments.find((t) => t.id === tournamentId);
  const regs = store.registrations.filter((r) => r.categoryId === categoryId);
  const groups = store.groups.filter((g) => g.categoryId === categoryId);
  const matches = store.matches.filter((m) => m.categoryId === categoryId);
  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const koMatches = matches
    .filter((m) => m.phase === "KO")
    .sort((a, b) => a.round - b.round || a.position - b.position);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");
  const [warn, setWarn] = useState("");
  const [impact, setImpact] = useState<CorrectionImpact | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [scoreDraft, setScoreDraft] = useState<Record<string, { a: string; b: string }>>({});
  const [scheduleDraft, setScheduleDraft] = useState<Record<string, string>>({});

  const standings = useMemo(() => {
    return groups.map((g) => ({
      group: g,
      ...eng.getGroupStandings(g.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store snapshot drives refresh
  }, [store, groups, eng]);

  if (!cat || !tournament) {
    return (
      <p>
        Categoria não encontrada. <Link to="/">Voltar</Link>
      </p>
    );
  }

  const nameOf = (id?: string) => eng.regName(id);

  const renderMatchRow = (m: Match) => {
    const draft = scoreDraft[m.id] ?? { a: "6", b: "3" };
    const when = scheduleDraft[m.id] ?? m.scheduledAt?.slice(0, 16) ?? "";
    const played = m.status === "played" || m.status === "wo" || m.status === "bye";
    return (
      <div
        key={m.id}
        className="grid gap-2 rounded-md border border-[hsl(var(--border))] p-3 text-sm sm:grid-cols-[1fr_auto]"
      >
        <div>
          <p className="font-medium">
            {m.placeholderA || nameOf(m.sideAId)}{" "}
            <span className="text-[hsl(var(--muted-foreground))]">vs</span>{" "}
            {m.placeholderB || nameOf(m.sideBId)}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {m.phase} R{m.round} #{m.position} · {m.status}
            {m.winnerRegistrationId ? ` · vencedor: ${nameOf(m.winnerRegistrationId)}` : ""}
            {m.score?.woSide ? " · W.O." : ""}
            {m.scheduledAt ? ` · ${new Date(m.scheduledAt).toLocaleString()}` : ""}
            {m.court ? ` · ${m.court}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!played && m.sideAId && m.sideBId && (
            <>
              <div className="flex items-center gap-1">
                <Input
                  className="w-14"
                  value={draft.a}
                  onChange={(e) =>
                    setScoreDraft((s) => ({ ...s, [m.id]: { ...draft, a: e.target.value } }))
                  }
                  aria-label="Games A"
                />
                <span>–</span>
                <Input
                  className="w-14"
                  value={draft.b}
                  onChange={(e) =>
                    setScoreDraft((s) => ({ ...s, [m.id]: { ...draft, b: e.target.value } }))
                  }
                  aria-label="Games B"
                />
              </div>
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  void run((e) =>
                    e.recordScore(m.id, [
                      { gamesA: Number(draft.a), gamesB: Number(draft.b) },
                    ]),
                  )
                    .then(() => {
                      setMsg("Placar lançado.");
                      setWarn("");
                    })
                    .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
                }}
              >
                Placar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => {
                  void run((e) => e.recordWo(m.id, "A"))
                    .then(() => setMsg("W.O. para lado A."))
                    .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
                }}
              >
                W.O. A
              </Button>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => {
                  void run((e) => e.recordWo(m.id, "B"))
                    .then(() => setMsg("W.O. para lado B."))
                    .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
                }}
              >
                W.O. B
              </Button>
            </>
          )}
          {played && m.status !== "bye" && (
            <Button
              size="sm"
              variant="destructive"
              type="button"
              onClick={() => {
                const imp = eng.previewCancelImpact(m.id);
                setImpact(imp);
                setPendingCancelId(m.id);
              }}
            >
              Cancelar resultado
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Input
              type="datetime-local"
              className="w-48"
              value={when}
              onChange={(e) => setScheduleDraft((s) => ({ ...s, [m.id]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => {
                if (!when) return;
                const iso = new Date(when).toISOString();
                void run((e) => e.scheduleMatch(m.id, iso))
                  .then(({ conflicts: c }) => {
                    setConflicts(c);
                    setMsg(
                      c.length
                        ? "Horário salvo com aviso de conflito entre categorias."
                        : "Horário salvo.",
                    );
                  })
                  .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
              }}
            >
              Agendar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/t/${tournamentId}`}
          className="text-sm text-[hsl(var(--muted-foreground))] hover:underline"
        >
          ← {tournament.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{cat.name}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {cat.format === "GROUP_KO" ? "G+C" : "Eliminatória"} · {cat.entryType} · {cat.status}
          {cat.format === "GROUP_KO"
            ? ` · ${cat.numGroups} grupos / ${cat.advancersPerGroup} class.`
            : ""}
        </p>
      </div>

      {(msg || warn) && (
        <Alert variant={warn ? "destructive" : "default"}>
          <AlertTitle>{warn ? "Atenção" : "OK"}</AlertTitle>
          <AlertDescription>{warn || msg}</AlertDescription>
        </Alert>
      )}

      {conflicts.length > 0 && (
        <Alert>
          <AlertTitle>Conflito de horário entre categorias</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {conflicts.map((c, i) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs">Agendamento permitido (não bloqueante).</p>
          </AlertDescription>
        </Alert>
      )}

      {impact && pendingCancelId && (
        <Alert variant={impact.divergenceWarning ? "destructive" : "default"}>
          <AlertTitle>
            {impact.divergenceWarning ? "Divergência pós-correção" : "Confirmar cancelamento"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{impact.message}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  void run((e) =>
                    e.cancelScore(pendingCancelId, {
                      correctionKind: "score_only",
                      confirmClear: false,
                    }),
                  )
                    .then(() => {
                      setImpact(null);
                      setPendingCancelId(null);
                      setMsg("Resultado cancelado (só placar — avanços mantidos).");
                    })
                    .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
                }}
              >
                Só placar (não limpar avanço)
              </Button>
              <Button
                size="sm"
                variant="destructive"
                type="button"
                onClick={() => {
                  void run((e) =>
                    e.cancelScore(pendingCancelId, {
                      correctionKind: "advancement_mismatch",
                      confirmClear: true,
                    }),
                  )
                    .then(() => {
                      setImpact(null);
                      setPendingCancelId(null);
                      setMsg("Resultado cancelado e avanços limpos.");
                    })
                    .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
                }}
              >
                Atleta/classificação errada (limpar avanço)
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => {
                  setImpact(null);
                  setPendingCancelId(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] p-4">
        <h2 className="text-lg font-semibold">Inscrições</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label>Atleta 1</Label>
            <Input value={p1} onChange={(e) => setP1(e.target.value)} />
          </div>
          {cat.entryType === "doubles" && (
            <div className="space-y-1">
              <Label>Atleta 2 (parceiro)</Label>
              <Input value={p2} onChange={(e) => setP2(e.target.value)} />
            </div>
          )}
          <Button
            type="button"
            onClick={() => {
              const names =
                cat.entryType === "doubles" ? [p1.trim(), p2.trim()] : [p1.trim()];
              void run((e) => e.register({ categoryId: cat.id, names }))
                .then(() => {
                  setP1("");
                  setP2("");
                  setMsg("Inscrito.");
                  setWarn("");
                })
                .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
            }}
          >
            Inscrever
          </Button>
        </div>
        <ul className="text-sm">
          {regs.map((r) => (
            <li key={r.id}>
              {r.displayName}
              {r.groupId
                ? ` · ${groups.find((g) => g.id === r.groupId)?.label ?? r.groupId}`
                : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            void run((e) => e.generateDraw(cat.id))
              .then(() => {
                setMsg("Grupos/chave gerados.");
                setWarn("");
              })
              .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
          }}
        >
          Gerar grupos / chave
        </Button>
        {cat.format === "GROUP_KO" && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void run((e) => e.materializeBracket(cat.id))
                .then(() => {
                  setMsg("Chave materializada com classificados.");
                  setWarn("");
                })
                .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
            }}
          >
            Materializar eliminatória
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void publishCategory(cat.id, !cat.published)
              .then(() =>
                setMsg(cat.published ? "Despublicada." : "Publicada para consulta RO."),
              )
              .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
          }}
        >
          {cat.published ? "Despublicar" : "Publicar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void run((e) => e.completeCategory(cat.id))
              .then(() => setMsg("Categoria concluída."))
              .catch((err) => setWarn(err instanceof Error ? err.message : "Erro"));
          }}
        >
          Concluir categoria
        </Button>
        {cat.published && (
          <Button asChild variant="link">
            <Link to={`/public/${tournamentId}/${categoryId}`}>Ver consulta pública</Link>
          </Button>
        )}
      </section>

      {standings.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Classificação</h2>
          {standings.map(({ group, ranked, residualPending }) => (
            <div key={group.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">{group.label}</h3>
                {residualPending.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[hsl(var(--destructive))]">
                      Empate residual — posição por sorteio
                    </span>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        void run((e) => e.applyResidualDraw(group.id))
                          .then(() =>
                            setMsg(
                              "Sorteio aplicado e persistido. Classifique após o sorteio.",
                            ),
                          )
                          .catch((err) =>
                            setWarn(err instanceof Error ? err.message : "Erro"),
                          );
                      }}
                    >
                      Classificar após o sorteio
                    </Button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">Inscrito</th>
                      <th className="py-1 pr-2">V-D</th>
                      <th className="py-1 pr-2">Sets</th>
                      <th className="py-1 pr-2">Games</th>
                      <th className="py-1 pr-2">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r) => (
                      <tr key={r.registrationId} className="border-b border-[hsl(var(--border))]/60">
                        <td className="py-1 pr-2">{r.rank}</td>
                        <td className="py-1 pr-2">{nameOf(r.registrationId)}</td>
                        <td className="py-1 pr-2">
                          {r.wins}-{r.losses}
                        </td>
                        <td className="py-1 pr-2">
                          {r.setsFor}/{r.setsAgainst} ({r.setDiff >= 0 ? "+" : ""}
                          {r.setDiff})
                        </td>
                        <td className="py-1 pr-2">
                          {r.gamesFor}/{r.gamesAgainst} ({r.gameDiff >= 0 ? "+" : ""}
                          {r.gameDiff})
                        </td>
                        <td className="py-1 pr-2 text-xs">{r.rankSource}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {groupMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Jogos de grupo</h2>
          <div className="space-y-2">{groupMatches.map(renderMatchRow)}</div>
        </section>
      )}

      {koMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Eliminatória</h2>
          <div className="space-y-2">{koMatches.map(renderMatchRow)}</div>
        </section>
      )}
    </div>
  );
}
