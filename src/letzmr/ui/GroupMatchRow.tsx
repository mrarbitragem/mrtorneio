import { describeMatchResult, formatScheduleWhen } from "../domain/publicDraw";
import type { Match } from "../domain/types";
import { PairAvatars, pairNames } from "./PublicGroupTable";

function MatchSide({ name }: { name: string }) {
  const names = pairNames(name);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <PairAvatars names={names} />
      <div className="min-w-0 leading-tight">
        {names.map((line) => (
          <p key={line} className="truncate">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Linha de jogo abaixo do grupo: categoria, grupo, horário e confronto lado a lado. */
export function GroupMatchRow({
  match,
  categoryName,
  stageLabel,
  nameOf,
}: {
  match: Match;
  categoryName: string;
  stageLabel: string;
  nameOf: (id?: string, placeholder?: string) => string;
}) {
  const left = nameOf(match.sideAId, match.placeholderA);
  const right = nameOf(match.sideBId, match.placeholderB);
  const result = describeMatchResult(match, (id) => nameOf(id));
  return (
    <article
      className="flex items-center gap-4 overflow-x-auto border-b border-[hsl(var(--border))] py-4"
      data-testid="match-line"
    >
      <div className="w-44 shrink-0">
        <p className="font-medium leading-tight">{categoryName}</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))]" data-testid="match-when">
          {formatScheduleWhen(match.scheduledAt)}
        </p>
        {match.court ? (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{match.court}</p>
        ) : null}
      </div>
      <p className="w-36 shrink-0 text-sm text-[hsl(var(--muted-foreground))]">{stageLabel}</p>
      <div className="flex min-w-[16rem] flex-1 items-center gap-3">
        <MatchSide name={left} />
        <span className="shrink-0 font-semibold text-[hsl(var(--muted-foreground))]" aria-hidden="true">
          X
        </span>
        <MatchSide name={right} />
      </div>
      <div className="w-32 shrink-0 text-right text-sm">
        {result ? (
          <p className="font-semibold" data-testid="match-result">
            {result}
          </p>
        ) : (
          <p className="text-[hsl(var(--muted-foreground))]">Sem resultado</p>
        )}
      </div>
    </article>
  );
}
