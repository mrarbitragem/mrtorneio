import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TIEBREAK_RULES,
  formatScheduleWhen,
  groupPhaseLabel,
  groupTieBreakSummary,
  isGroupComplete,
  knockoutRoundTitle,
  formatSetScore,
  matchNumberIndex,
  standingsNeededTieBreak,
} from "../domain/publicDraw";
import type { Group, LetzmrStore, Match, SetScore, StandingRow } from "../domain/types";
import { createEngine } from "../store/engine";

function pairLines(name: string): string[] {
  const parts = name.split(" / ").map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : ["A definir"];
}

function ScoreDigits({ set }: { set: SetScore }) {
  return <span data-testid="set-score">{formatSetScore(set)}</span>;
}

function MatchLine({
  match,
  number,
  phase,
  nameOf,
}: {
  match: Match;
  number: number;
  phase: string;
  nameOf: (id?: string, placeholder?: string) => string;
}) {
  const left = nameOf(match.sideAId, match.placeholderA);
  const right = nameOf(match.sideBId, match.placeholderB);
  return (
    <article className="border-b border-[hsl(var(--border))] py-3 text-sm" data-testid="match-line">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        Jogo #{number} · {phase}
      </p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          {pairLines(left).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="text-right">
          {pairLines(right).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      {match.score?.woSide ? (
        <p className="mt-1 text-xs">W.O.</p>
      ) : (
        match.score?.sets.map((set, index) => (
          <p key={index} className="mt-1 font-medium">
            <ScoreDigits set={set} />
          </p>
        ))
      )}
    </article>
  );
}

function PlaceRow({
  row,
  name,
  open,
  onToggle,
}: {
  row: StandingRow;
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[hsl(var(--border))] py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          {pairLines(name).map((line) => (
            <p key={line} className="text-sm font-medium">
              {line}
            </p>
          ))}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{row.rank}º</p>
          <button type="button" className="text-xs underline" onClick={onToggle}>
            ver infos
          </button>
        </div>
      </div>
      {open && (
        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          {row.wins}V {row.losses}D · sets {row.setDiff >= 0 ? "+" : ""}
          {row.setDiff} · games {row.gameDiff >= 0 ? "+" : ""}
          {row.gameDiff}
        </p>
      )}
    </div>
  );
}

export function PublicCategoryView({
  store,
  categoryId,
  tournamentName,
  categoryName,
}: {
  store: LetzmrStore;
  categoryId: string;
  tournamentName: string;
  categoryName: string;
}) {
  const eng = useMemo(() => createEngine(store), [store]);
  const groups = store.groups
    .filter((group) => group.categoryId === categoryId)
    .sort((a, b) => a.index - b.index);
  const matches = store.matches.filter((match) => match.categoryId === categoryId);
  const numbers = useMemo(() => matchNumberIndex(matches, groups), [matches, groups]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [infoOpen, setInfoOpen] = useState<Record<string, boolean>>({});
  const [rulesOpen, setRulesOpen] = useState<Record<string, boolean>>({});

  const nameOf = (id?: string, placeholder?: string) =>
    id ? eng.regName(id) : placeholder || "A definir";

  const koRounds = [...new Set(matches.filter((match) => match.phase === "KO").map((match) => match.round))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Consulta pública
        </p>
        <h1 className="text-2xl font-bold">{tournamentName}</h1>
        <p className="text-sm">{categoryName}</p>
      </div>

      <Tabs defaultValue={groups.length > 0 ? "grupos" : "chave"}>
        <TabsList>
          {groups.length > 0 && <TabsTrigger value="grupos">Grupos</TabsTrigger>}
          {koRounds.length > 0 && <TabsTrigger value="chave">Chave</TabsTrigger>}
          <TabsTrigger value="horarios">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="grupos" className="space-y-8">
          {groups.map((group) => (
            <GroupBlock
              key={group.id}
              group={group}
              matches={matches}
              numbers={numbers}
              ranked={eng.getGroupStandings(group.id).ranked}
              nameOf={nameOf}
              matchesOpen={Boolean(openGroups[group.id])}
              onToggleMatches={() =>
                setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))
              }
              infoOpen={infoOpen}
              onToggleInfo={(id) => setInfoOpen((current) => ({ ...current, [id]: !current[id] }))}
              rulesOpen={Boolean(rulesOpen[group.id])}
              onToggleRules={() =>
                setRulesOpen((current) => ({ ...current, [group.id]: !current[group.id] }))
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="chave">
          <div className="flex gap-4 overflow-x-auto pb-2" data-testid="ko-bracket">
            {koRounds.map((round) => {
              const column = matches
                .filter((match) => match.phase === "KO" && match.round === round)
                .sort((a, b) => a.position - b.position);
              return (
                <section key={round} className="min-w-64 flex-1" data-testid="ko-column">
                  <h2 className="mb-2 text-sm font-semibold">{knockoutRoundTitle(column.length)}</h2>
                  {column.map((match) => (
                    <MatchLine
                      key={match.id}
                      match={match}
                      number={numbers.get(match.id) ?? match.position}
                      phase={knockoutRoundTitle(column.length)}
                      nameOf={nameOf}
                    />
                  ))}
                </section>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="horarios">
          <ScheduleList matches={matches} groups={groups} numbers={numbers} nameOf={nameOf} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GroupBlock({
  group,
  matches,
  numbers,
  ranked,
  nameOf,
  matchesOpen,
  onToggleMatches,
  infoOpen,
  onToggleInfo,
  rulesOpen,
  onToggleRules,
}: {
  group: Group;
  matches: Match[];
  numbers: Map<string, number>;
  ranked: StandingRow[];
  nameOf: (id?: string, placeholder?: string) => string;
  matchesOpen: boolean;
  onToggleMatches: () => void;
  infoOpen: Record<string, boolean>;
  onToggleInfo: (id: string) => void;
  rulesOpen: boolean;
  onToggleRules: () => void;
}) {
  const groupMatches = matches
    .filter((match) => match.groupId === group.id && match.phase === "GROUP")
    .sort((a, b) => a.position - b.position);
  const complete = isGroupComplete(matches, group.id);
  const showTieBreak = standingsNeededTieBreak(ranked);
  const label = `GRUPO ${String(group.index).padStart(2, "0")}`;

  return (
    <section data-testid="group-block" data-complete={complete ? "yes" : "no"}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{label}</h2>
        {showTieBreak && (
          <button type="button" className="text-xs underline" onClick={onToggleRules}>
            Entenda o desempate
          </button>
        )}
      </div>
      {rulesOpen && (
        <div className="mb-3 space-y-1 rounded-md border border-[hsl(var(--border))] p-3 text-sm" data-testid="tiebreak">
          <p>{groupTieBreakSummary(ranked)}</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-[hsl(var(--muted-foreground))]">
            {TIEBREAK_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-[hsl(var(--muted-foreground))]">Posição</p>
      {ranked.map((row) => (
        <PlaceRow
          key={row.registrationId}
          row={row}
          name={nameOf(row.registrationId)}
          open={Boolean(infoOpen[row.registrationId])}
          onToggle={() => onToggleInfo(row.registrationId)}
        />
      ))}
      {complete ? (
        <p className="mt-3 text-sm">
          Os jogos do {label} estão concluídos.{" "}
          <button type="button" className="underline" onClick={onToggleMatches} data-testid="visualizar">
            Visualizar
          </button>
        </p>
      ) : null}
      {(!complete || matchesOpen) && (
        <div data-testid="group-matches">
          {groupMatches.map((match) => (
            <MatchLine
              key={match.id}
              match={match}
              number={numbers.get(match.id) ?? match.position}
              phase={groupPhaseLabel(group)}
              nameOf={nameOf}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleList({
  matches,
  groups,
  numbers,
  nameOf,
}: {
  matches: Match[];
  groups: Group[];
  numbers: Map<string, number>;
  nameOf: (id?: string, placeholder?: string) => string;
}) {
  const slots = new Map<string, Match[]>();
  const sorted = [...matches].sort((a, b) => {
    if (a.scheduledAt && b.scheduledAt && a.scheduledAt !== b.scheduledAt) {
      return a.scheduledAt.localeCompare(b.scheduledAt);
    }
    if (a.scheduledAt && !b.scheduledAt) return -1;
    if (!a.scheduledAt && b.scheduledAt) return 1;
    return (a.court ?? "").localeCompare(b.court ?? "");
  });
  for (const match of sorted) {
    const when = formatScheduleWhen(match.scheduledAt);
    const court = match.court ?? "";
    const key = `${when}||${court}`;
    const list = slots.get(key) ?? [];
    list.push(match);
    slots.set(key, list);
  }

  return (
    <div className="space-y-6">
      {[...slots.entries()].map(([key, slotMatches]) => {
        const [when, court] = key.split("||");
        return (
          <section key={key} data-testid="schedule-slot">
            <h2 className="text-sm font-semibold">
              {when}
              {court ? ` · ${court}` : ""}
            </h2>
            {slotMatches.map((match) => {
              const group = groups.find((item) => item.id === match.groupId);
              const columnSize = matches.filter(
                (item) => item.phase === "KO" && item.round === match.round,
              ).length;
              const phase =
                match.phase === "GROUP" ? groupPhaseLabel(group) : knockoutRoundTitle(columnSize);
              return (
                <MatchLine
                  key={match.id}
                  match={match}
                  number={numbers.get(match.id) ?? match.position}
                  phase={phase}
                  nameOf={nameOf}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
