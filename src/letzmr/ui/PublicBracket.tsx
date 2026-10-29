import { Check, X } from "lucide-react";
import { formatScheduleWhen, knockoutRoundLabel } from "../domain/publicDraw";
import type { Match } from "../domain/types";

/** Altura reservada por jogo na 1ª coluna; as colunas seguintes dobram a cada rodada. */
const CELL_HEIGHT = 168;

type NameOf = (id?: string, placeholder?: string) => string;

function pairLines(name: string): string[] {
  const parts = name
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : ["A definir"];
}

function sideScore(match: Match, side: "A" | "B"): string {
  if (!match.score) return "";
  if (match.score.woSide) {
    return match.score.woSide === side ? "" : "W.O.";
  }
  return match.score.sets.map((s) => (side === "A" ? s.gamesA : s.gamesB)).join(" ");
}

function SideRow({
  match,
  side,
  nameOf,
}: {
  match: Match;
  side: "A" | "B";
  nameOf: NameOf;
}) {
  const id = side === "A" ? match.sideAId : match.sideBId;
  const placeholder = side === "A" ? match.placeholderA : match.placeholderB;
  const isBye = match.status === "bye" && !id;
  const label = isBye ? "BYE" : nameOf(id, placeholder);
  const decided = Boolean(match.winnerRegistrationId) && match.status !== "bye";
  const won = decided && id === match.winnerRegistrationId;
  const lost = decided && Boolean(id) && id !== match.winnerRegistrationId;
  const score = sideScore(match, side);

  return (
    <div className="flex items-stretch justify-between border-b border-[hsl(var(--border))] last:border-b-0">
      <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {won && <Check className="h-4 w-4 text-emerald-600" aria-label="Vencedor" />}
          {lost && <X className="h-4 w-4 text-red-500" aria-label="Eliminado" />}
        </span>
        <div className={won ? "font-semibold" : ""}>
          {pairLines(label).map((line) => (
            <p key={line} className="truncate leading-tight">
              {line}
            </p>
          ))}
        </div>
      </div>
      <div
        className={
          "flex w-12 shrink-0 items-center justify-center border-l border-[hsl(var(--border))] text-sm " +
          (won ? "bg-[hsl(var(--muted))] font-bold" : "")
        }
      >
        {score}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  number,
  nameOf,
}: {
  match: Match;
  number: number;
  nameOf: NameOf;
}) {
  return (
    <article
      className="w-full rounded-md border border-[hsl(var(--border))] bg-white text-sm shadow-sm"
      data-testid="ko-match"
    >
      <header className="border-b border-[hsl(var(--border))] px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
        Jogo #{number}
      </header>
      <SideRow match={match} side="A" nameOf={nameOf} />
      <SideRow match={match} side="B" nameOf={nameOf} />
      <footer
        className="border-t border-[hsl(var(--border))] px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))]"
        data-testid="ko-when"
      >
        {match.scheduledAt ? formatScheduleWhen(match.scheduledAt) : "Data e horário a definir"}
        {match.court ? ` · ${match.court}` : ""}
      </footer>
    </article>
  );
}

/** Chave eliminatória em colunas, com as linhas ligando cada jogo ao da fase seguinte. */
export function PublicBracket({
  matches,
  numbers,
  nameOf,
}: {
  matches: Match[];
  numbers: Map<string, number>;
  nameOf: NameOf;
}) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const columns = rounds.map((round) =>
    matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position),
  );
  if (columns.length === 0) return null;

  // As linhas só fazem sentido quando cada fase tem metade dos jogos da anterior.
  const connected = columns.every(
    (col, i) => i === columns.length - 1 || col.length === columns[i + 1].length * 2,
  );
  const bodyHeight = columns[0].length * CELL_HEIGHT;

  return (
    <div className="overflow-x-auto pb-3" data-testid="ko-bracket">
      <div className="flex min-w-max">
        {columns.map((col, ci) => {
          const isLast = ci === columns.length - 1;
          return (
            <section key={rounds[ci]} className="w-80 shrink-0" data-testid="ko-column">
              <h2 className="mb-2 text-center text-sm font-semibold">
                {knockoutRoundLabel(col.length)}
              </h2>
              <div className="flex flex-col" style={{ height: bodyHeight }}>
                {col.map((match, mi) => (
                  <div key={match.id} className="relative flex flex-1 items-center px-6">
                    {connected && ci > 0 && (
                      <span className="absolute left-0 top-1/2 h-px w-6 bg-[hsl(var(--muted-foreground))]/50" />
                    )}
                    <MatchCard
                      match={match}
                      number={numbers.get(match.id) ?? match.position}
                      nameOf={nameOf}
                    />
                    {connected && !isLast && (
                      <>
                        <span className="absolute right-0 top-1/2 h-px w-6 bg-[hsl(var(--muted-foreground))]/50" />
                        <span
                          className={
                            "absolute right-0 w-px bg-[hsl(var(--muted-foreground))]/50 " +
                            (mi % 2 === 0 ? "top-1/2 bottom-0" : "top-0 bottom-1/2")
                          }
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
