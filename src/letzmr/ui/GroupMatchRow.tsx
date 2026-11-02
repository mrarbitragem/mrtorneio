import { abbreviateCategoryName, describeMatchResult, formatScheduleCompact } from "../domain/publicDraw";
import type { Match } from "../domain/types";
import { PairAvatars, pairNames } from "./PublicGroupTable";

function MatchSide({ name, side }: { name: string; side: "left" | "right" }) {
  const names = pairNames(name);
  const avatars = <PairAvatars names={names} size="sm" className="hidden sm:flex" />;
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-1.5 ${side === "left" ? "justify-end" : "justify-start"}`}
    >
      {side === "left" ? avatars : null}
      <div className={`min-w-0 leading-tight ${side === "left" ? "text-right" : "text-left"}`}>
        {names.map((line) => (
          <p key={line} className="truncate" title={line}>
            {line}
          </p>
        ))}
      </div>
      {side === "right" ? avatars : null}
    </div>
  );
}

/** Linha de jogo abaixo do grupo: mesma largura da tabela, sem rolagem horizontal. */
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
  const shortCategory = abbreviateCategoryName(categoryName);
  return (
    <article
      className="grid w-full min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[hsl(var(--border))] py-3 text-sm sm:gap-x-3"
      data-testid="match-line"
    >
      <div className="min-w-0">
        <p className="font-medium leading-tight" title={categoryName}>
          {shortCategory}
        </p>
        <p className="whitespace-nowrap text-xs text-[hsl(var(--muted-foreground))]" data-testid="match-when">
          {formatScheduleCompact(match.scheduledAt)}
        </p>
        {match.court ? (
          <p className="truncate text-[10px] text-[hsl(var(--muted-foreground))]">{match.court}</p>
        ) : null}
      </div>
      <p className="whitespace-nowrap text-xs text-[hsl(var(--muted-foreground))]">{stageLabel}</p>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <MatchSide name={left} side="left" />
        <span className="shrink-0 font-semibold text-[hsl(var(--muted-foreground))]" aria-hidden="true">
          X
        </span>
        <MatchSide name={right} side="right" />
      </div>
      <div className="max-w-[5.5rem] min-w-0 text-right text-xs leading-tight sm:max-w-[7rem] sm:text-sm">
        {result ? (
          <p className="font-semibold" data-testid="match-result" title={result}>
            {result}
          </p>
        ) : (
          <p className="text-[hsl(var(--muted-foreground))]">Sem resultado</p>
        )}
      </div>
    </article>
  );
}
