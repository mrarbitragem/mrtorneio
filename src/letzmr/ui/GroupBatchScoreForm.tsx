import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Match } from "../domain/types";
import { parseSingleSetDraft } from "../domain/score";
import { useLetzmr } from "./useLetzmr";

function isOpenMatch(m: Match): boolean {
  return (
    m.status !== "played" &&
    m.status !== "wo" &&
    m.status !== "bye" &&
    Boolean(m.sideAId && m.sideBId)
  );
}

/** Lança os placares preenchidos de todos os jogos abertos do grupo de uma vez. */
export function GroupBatchScoreForm({
  groupId,
  groupLabel,
  matches,
  nameOf,
  scoreDraft,
  setScoreDraft,
  onDone,
  onError,
}: {
  groupId: string;
  groupLabel: string;
  matches: Match[];
  nameOf: (id?: string) => string;
  scoreDraft: Record<string, { a: string; b: string }>;
  setScoreDraft: Dispatch<SetStateAction<Record<string, { a: string; b: string }>>>;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { run } = useLetzmr();
  const [busy, setBusy] = useState(false);
  const open = matches.filter(isOpenMatch);
  if (open.length === 0) return null;

  const parsed = open.map((m) => {
    const draft = scoreDraft[m.id] ?? { a: "", b: "" };
    return { match: m, draft, score: parseSingleSetDraft(draft.a, draft.b) };
  });
  const ready = parsed.flatMap((row) =>
    row.score ? [{ id: row.match.id, score: row.score }] : [],
  );
  const invalidFilled = parsed.filter((row) => {
    const filled = row.draft.a.trim() !== "" || row.draft.b.trim() !== "";
    return filled && !row.score;
  }).length;

  const update = (matchId: string, side: "a" | "b", value: string) => {
    setScoreDraft((s) => {
      const draft = s[matchId] ?? { a: "", b: "" };
      return { ...s, [matchId]: { ...draft, [side]: value } };
    });
  };

  return (
    <div
      className="space-y-3 rounded-md border border-dashed border-[hsl(var(--border))] p-3"
      data-testid={`batch-scores-${groupId}`}
    >
      <div>
        <p className="text-sm font-medium">Lançar todos os resultados do {groupLabel}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Preencha os games e lance de uma vez. Ainda dá para lançar jogo a jogo
          abaixo, inclusive W.O.
        </p>
      </div>
      <div className="space-y-2">
        {parsed.map(({ match: m, draft }) => (
          <div
            key={m.id}
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
            data-testid={`batch-score-row-${m.id}`}
          >
            <p className="text-sm font-medium leading-tight">
              {nameOf(m.sideAId)}
            </p>
            <div className="flex items-center justify-center gap-1">
              <Input
                className="w-14"
                value={draft.a}
                onChange={(e) => update(m.id, "a", e.target.value)}
                aria-label={`Games ${nameOf(m.sideAId)}`}
                placeholder="0"
                inputMode="numeric"
                onFocus={(e) => e.target.select()}
              />
              <span className="text-[hsl(var(--muted-foreground))]">–</span>
              <Input
                className="w-14"
                value={draft.b}
                onChange={(e) => update(m.id, "b", e.target.value)}
                aria-label={`Games ${nameOf(m.sideBId)}`}
                placeholder="0"
                inputMode="numeric"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <p className="text-sm font-medium leading-tight sm:text-right">
              {nameOf(m.sideBId)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={ready.length === 0 || busy}
          data-testid="batch-save-group"
          onClick={() => {
            setBusy(true);
            const items = ready;
            void run((e) => {
              for (const item of items) {
                e.recordScore(item.id, [item.score]);
              }
              return items.length;
            })
              .then((n) => {
                setScoreDraft((s) => {
                  const next = { ...s };
                  for (const item of items) delete next[item.id];
                  return next;
                });
                onDone(
                  n === open.length
                    ? `Todos os ${n} resultado(s) do ${groupLabel} lançados.`
                    : `${n} resultado(s) do ${groupLabel} lançado(s). ${open.length - n} ainda pendente(s).`,
                );
              })
              .catch((err) =>
                onError(err instanceof Error ? err.message : "Erro"),
              )
              .finally(() => setBusy(false));
          }}
        >
          {ready.length > 0
            ? `Lançar ${ready.length} resultado${ready.length === 1 ? "" : "s"} do grupo`
            : "Lançar resultados do grupo"}
        </Button>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {invalidFilled > 0
            ? `${invalidFilled} placar(es) inválido(s) (empate ou número incompleto).`
            : ready.length === 0
              ? "Informe os games sem empate. Pode lançar só os jogos já preenchidos."
              : ready.length < open.length
                ? `${open.length - ready.length} jogo(s) ainda sem placar válido ficam para depois.`
                : "Todos os jogos abertos estão prontos."}
        </p>
      </div>
    </div>
  );
}
