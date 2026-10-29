import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseRegistrationList } from "../domain/registrationList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BRACKET_SEEDING_LABEL } from "../domain/bracket";
import type {
  CorrectionImpact,
  Match,
  ScheduleConflict,
} from "../domain/types";
import { CategorySetupPanel } from "./CategorySetupPanel";
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
  const [listText, setListText] = useState("");
  const [msg, setMsg] = useState("");
  const [warn, setWarn] = useState("");
  const [impact, setImpact] = useState<CorrectionImpact | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [scoreDraft, setScoreDraft] = useState<
    Record<string, { a: string; b: string }>
  >({});
  const [scheduleDraft, setScheduleDraft] = useState<Record<string, string>>(
    {},
  );

  const parsedList = useMemo(
    () => parseRegistrationList(listText, cat?.entryType ?? "doubles"),
    [listText, cat?.entryType],
  );

  const standings = useMemo(() => {
    return groups.map((g) => ({
      group: g,
      ...eng.getGroupStandings(g.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store snapshot drives refresh
  }, [store, groups, eng]);

  const crossRanking = useMemo(() => {
    if (
      !cat ||
      cat.format !== "GROUP_KO" ||
      cat.bracketSeeding !== "CROSS_RANKING"
    )
      return null;
    if (groups.length === 0) return null;
    try {
      return eng.getFirstPlaceRanking(cat.id);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store snapshot drives refresh
  }, [store, cat, groups, eng]);

  if (!cat || !tournament) {
    return (
      <p>
        Categoria não encontrada. <Link to="/">Voltar</Link>
      </p>
    );
  }

  const nameOf = (id?: string) => eng.regName(id);
  const singleGroup = cat.format === "GROUP_KO" && cat.numGroups === 1;
  const hasKnockout = cat.format === "KO" || cat.advancersPerGroup > 0;

  const renderMatchRow = (m: Match) => {
    const draft = scoreDraft[m.id] ?? { a: "6", b: "3" };
    const when = scheduleDraft[m.id] ?? m.scheduledAt?.slice(0, 16) ?? "";
    const played =
      m.status === "played" || m.status === "wo" || m.status === "bye";
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
            {m.winnerRegistrationId
              ? ` · vencedor: ${nameOf(m.winnerRegistrationId)}`
              : ""}
            {m.score?.woSide ? " · W.O." : ""}
            {m.scheduledAt
              ? ` · ${new Date(m.scheduledAt).toLocaleString()}`
              : ""}
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
                    setScoreDraft((s) => ({
                      ...s,
                      [m.id]: { ...draft, a: e.target.value },
                    }))
                  }
                  aria-label="Games A"
                />
                <span>–</span>
                <Input
                  className="w-14"
                  value={draft.b}
                  onChange={(e) =>
                    setScoreDraft((s) => ({
                      ...s,
                      [m.id]: { ...draft, b: e.target.value },
                    }))
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
                    .catch((err) =>
                      setWarn(err instanceof Error ? err.message : "Erro"),
                    );
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
                    .catch((err) =>
                      setWarn(err instanceof Error ? err.message : "Erro"),
                    );
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
                    .catch((err) =>
                      setWarn(err instanceof Error ? err.message : "Erro"),
                    );
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
              onChange={(e) =>
                setScheduleDraft((s) => ({ ...s, [m.id]: e.target.value }))
              }
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
                  .catch((err) =>
                    setWarn(err instanceof Error ? err.message : "Erro"),
                  );
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
          {cat.format === "GROUP_KO" ? "G+C" : "Eliminatória"} · {cat.entryType}{" "}
          · {cat.status}
          {cat.format === "GROUP_KO"
            ? singleGroup
              ? cat.advancersPerGroup === 0
                ? " · grupo único (termina no grupo)"
                : " · grupo único + final (1º × 2º)"
              : ` · ${cat.numGroups} grupos / ${cat.advancersPerGroup} class.`
            : ""}
        </p>
        {cat.format === "GROUP_KO" && !singleGroup && (
          <p
            className="text-xs text-[hsl(var(--muted-foreground))]"
            data-testid="bracket-seeding-label"
          >
            Chave: {BRACKET_SEEDING_LABEL[cat.bracketSeeding ?? "BY_GROUP"]}
          </p>
        )}
      </div>

      {cat.published && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          data-testid="published-banner"
        >
          <span>
            <strong>No ar:</strong> os atletas estão vendo esta categoria. Os
            resultados novos só aparecem depois de “Atualizar página pública”.
          </span>
          <span className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/public/${tournamentId}/${categoryId}`}>
                Ver página pública
              </Link>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              type="button"
              data-testid="unpublish"
              onClick={() => {
                void publishCategory(cat.id, false)
                  .then(() => {
                    setMsg(
                      "Página pública fora do ar. Ajuste o que precisar e publique de novo.",
                    );
                    setWarn("");
                  })
                  .catch((err) =>
                    setWarn(err instanceof Error ? err.message : "Erro"),
                  );
              }}
            >
              Despublicar (tirar do ar)
            </Button>
          </span>
        </div>
      )}

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
            <p className="mt-1 text-xs">
              Agendamento permitido (não bloqueante).
            </p>
          </AlertDescription>
        </Alert>
      )}

      {impact && pendingCancelId && (
        <Alert variant={impact.divergenceWarning ? "destructive" : "default"}>
          <AlertTitle>
            {impact.divergenceWarning
              ? "Divergência pós-correção"
              : "Confirmar cancelamento"}
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
                      setMsg(
                        "Resultado cancelado (só placar — avanços mantidos).",
                      );
                    })
                    .catch((err) =>
                      setWarn(err instanceof Error ? err.message : "Erro"),
                    );
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
                    .catch((err) =>
                      setWarn(err instanceof Error ? err.message : "Erro"),
                    );
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
                cat.entryType === "doubles"
                  ? [p1.trim(), p2.trim()]
                  : [p1.trim()];
              void run((e) => e.register({ categoryId: cat.id, names }))
                .then(() => {
                  setP1("");
                  setP2("");
                  setMsg("Inscrito.");
                  setWarn("");
                })
                .catch((err) =>
                  setWarn(err instanceof Error ? err.message : "Erro"),
                );
            }}
          >
            Inscrever
          </Button>
        </div>

        <div className="space-y-2 border-t border-[hsl(var(--border))] pt-3">
          <Label htmlFor="reg-list">Inscrever em lista</Label>
          <Textarea
            id="reg-list"
            data-testid="registration-list"
            rows={6}
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            placeholder={
              cat.entryType === "doubles"
                ? "1. Dilma / Sueli\n2. Gisele / Bia\n3. Renata / Patricia"
                : "1. Dilma\n2. Gisele\n3. Renata"
            }
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Uma {cat.entryType === "doubles" ? "dupla" : "inscrição"} por linha.{" "}
            {cat.entryType === "doubles"
              ? "Separe os dois atletas com / (obrigatório: cada dupla tem exatamente 2 nomes)."
              : "Um nome por linha."}{" "}
            A numeração no começo da linha é opcional.
          </p>
          {listText.trim() && (
            <div
              className="space-y-1 text-sm"
              data-testid="registration-list-preview"
            >
              {parsedList.errors.length === 0 ? (
                <p>
                  {parsedList.entries.length}{" "}
                  {parsedList.entries.length === 1
                    ? "inscrição pronta"
                    : "inscrições prontas"}
                  .
                </p>
              ) : (
                <>
                  <p className="text-[hsl(var(--destructive))]">
                    Corrija{" "}
                    {parsedList.errors.length === 1 ? "a linha" : "as linhas"}{" "}
                    abaixo para inscrever (nada é inscrito enquanto houver
                    erro):
                  </p>
                  <ul className="list-disc pl-5 text-[hsl(var(--destructive))]">
                    {parsedList.errors.map((er) => (
                      <li key={er.line}>
                        Linha {er.line} “{er.text}”: {er.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {parsedList.repeatedNames.length > 0 && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Atenção: nome repetido na lista:{" "}
                  {parsedList.repeatedNames.join(", ")}.
                </p>
              )}
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            data-testid="register-list"
            disabled={
              !listText.trim() ||
              parsedList.errors.length > 0 ||
              parsedList.entries.length === 0
            }
            onClick={() => {
              void run((e) => e.registerMany(cat.id, parsedList.entries))
                .then((created) => {
                  setListText("");
                  setMsg(`${created.length} inscrição(ões) feita(s).`);
                  setWarn("");
                })
                .catch((err) =>
                  setWarn(err instanceof Error ? err.message : "Erro"),
                );
            }}
          >
            Inscrever lista
          </Button>
        </div>

        <ul className="text-sm">
          {regs.map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-0.5">
              <span>
                {r.displayName}
                {r.groupId
                  ? ` · ${groups.find((g) => g.id === r.groupId)?.label ?? r.groupId}`
                  : ""}
              </span>
              {groups.length === 0 && matches.length === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-[hsl(var(--destructive))]"
                  data-testid="remove-registration"
                  onClick={() => {
                    void run((e) => e.removeRegistration(r.id))
                      .then(() => {
                        setMsg("Inscrição removida.");
                        setWarn("");
                      })
                      .catch((err) =>
                        setWarn(err instanceof Error ? err.message : "Erro"),
                      );
                  }}
                >
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-2">
        {/* Com sorteio já feito, o botão é "Refazer sorteio" (com confirmação) em Ajustes. */}
        {matches.length === 0 && groups.length === 0 && (
          <Button
            type="button"
            onClick={() => {
              void run((e) => e.generateDraw(cat.id))
                .then(() => {
                  setMsg("Grupos/chave gerados.");
                  setWarn("");
                })
                .catch((err) =>
                  setWarn(err instanceof Error ? err.message : "Erro"),
                );
            }}
          >
            Gerar jogos
          </Button>
        )}
        {cat.format === "GROUP_KO" && hasKnockout && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void run((e) => e.materializeBracket(cat.id))
                .then(() => {
                  setMsg("Chave materializada com classificados.");
                  setWarn("");
                })
                .catch((err) =>
                  setWarn(err instanceof Error ? err.message : "Erro"),
                );
            }}
          >
            {singleGroup ? "Montar final" : "Materializar eliminatória"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          data-testid="publish"
          onClick={() => {
            void publishCategory(cat.id, true)
              .then(() =>
                setMsg(
                  cat.published
                    ? "Página pública atualizada com os resultados atuais."
                    : "Publicada para consulta dos atletas.",
                ),
              )
              .catch((err) =>
                setWarn(err instanceof Error ? err.message : "Erro"),
              );
          }}
        >
          {cat.published ? "Atualizar página pública" : "Publicar as chaves"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void run((e) => e.completeCategory(cat.id))
              .then(() => setMsg("Categoria concluída."))
              .catch((err) =>
                setWarn(err instanceof Error ? err.message : "Erro"),
              );
          }}
        >
          Concluir categoria
        </Button>
        {cat.published && (
          <Button asChild variant="link">
            <Link to={`/public/${tournamentId}/${categoryId}`}>
              Ver consulta pública
            </Link>
          </Button>
        )}
      </section>

      <CategorySetupPanel key={cat.id} cat={cat} tournamentId={tournament.id} />

      {crossRanking && (
        <section
          className="space-y-2 rounded-lg border border-[hsl(var(--border))] p-4"
          data-testid="cross-ranking"
        >
          <h2 className="text-lg font-semibold">Ranking dos 1ºs colocados</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Critério: {crossRanking.criteria}.
            {!crossRanking.allGroupsComplete &&
              " Parcial: a chave só é montada com todos os grupos concluídos."}
          </p>
          <ol className="list-decimal pl-5 text-sm">
            {crossRanking.orderedGroupIds.map((gid) => {
              const group = crossRanking.groups.find((g) => g.id === gid);
              const first = standings
                .find((s) => s.group.id === gid)
                ?.ranked.find((r) => r.rank === 1);
              return (
                <li key={gid}>
                  {group?.label}: {first ? nameOf(first.registrationId) : "—"}
                  {first
                    ? ` · ${first.wins}V ${first.losses}D · sets ${first.setDiff >= 0 ? "+" : ""}${first.setDiff} · games ${first.gameDiff >= 0 ? "+" : ""}${first.gameDiff}`
                    : ""}
                </li>
              );
            })}
          </ol>
          {crossRanking.allGroupsComplete &&
            crossRanking.tiedGroupIds.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-[hsl(var(--destructive))]">
                  Empate entre 1ºs colocados em todos os critérios:{" "}
                  {crossRanking.tiedGroupIds
                    .map((ids) =>
                      ids
                        .map(
                          (id) =>
                            crossRanking.groups.find((g) => g.id === id)?.label,
                        )
                        .join(" e "),
                    )
                    .join("; ")}
                  .
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void run((e) => e.drawFirstPlaceTie(cat.id))
                      .then(() => {
                        setMsg("Desempate dos 1ºs sorteado.");
                        setWarn("");
                      })
                      .catch((err) =>
                        setWarn(err instanceof Error ? err.message : "Erro"),
                      );
                  }}
                >
                  Sortear desempate dos 1ºs
                </Button>
              </div>
            )}
          {crossRanking.resolvedByDrawGroupIds.length > 0 && (
            <div className="space-y-2" data-testid="cross-tie-draw-saved">
              <p className="text-sm">
                Empate entre 1ºs resolvido por sorteio gravado
                {cat.crossTieDrawnAt
                  ? ` em ${new Date(cat.crossTieDrawnAt).toLocaleString("pt-BR")}`
                  : ""}
                :{" "}
                {crossRanking.resolvedByDrawGroupIds
                  .map((ids) =>
                    ids
                      .map(
                        (id) =>
                          crossRanking.groups.find((g) => g.id === id)?.label,
                      )
                      .join(" → "),
                  )
                  .join("; ")}
                . O sorteio não muda sozinho.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="redo-cross-tie-draw"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Refazer o sorteio de desempate dos 1ºs? A ordem atual será substituída e, se a chave já estiver montada, os confrontos da 1ª rodada serão remontados.",
                    )
                  )
                    return;
                  void run((e) =>
                    e.drawFirstPlaceTie(cat.id, undefined, { redo: true }),
                  )
                    .then(() => {
                      setMsg("Sorteio dos 1ºs refeito.");
                      setWarn("");
                    })
                    .catch((err) =>
                      setWarn(err instanceof Error ? err.message : "Erro"),
                    );
                }}
              >
                Refazer sorteio
              </Button>
            </div>
          )}
        </section>
      )}

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
                            setWarn(
                              err instanceof Error ? err.message : "Erro",
                            ),
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
                      <tr
                        key={r.registrationId}
                        className="border-b border-[hsl(var(--border))]/60"
                      >
                        <td className="py-1 pr-2">{r.rank}</td>
                        <td className="py-1 pr-2">
                          {nameOf(r.registrationId)}
                        </td>
                        <td className="py-1 pr-2">
                          {r.wins}-{r.losses}
                        </td>
                        <td className="py-1 pr-2">
                          {r.setsFor}/{r.setsAgainst} (
                          {r.setDiff >= 0 ? "+" : ""}
                          {r.setDiff})
                        </td>
                        <td className="py-1 pr-2">
                          {r.gamesFor}/{r.gamesAgainst} (
                          {r.gameDiff >= 0 ? "+" : ""}
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
