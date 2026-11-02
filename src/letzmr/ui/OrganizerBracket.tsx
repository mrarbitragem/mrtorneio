import { useState, type ReactNode } from "react";
import { Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatScheduleWhen, knockoutRoundLabel } from "../domain/publicDraw";
import type { Match, ScheduleConflict } from "../domain/types";
import { useLetzmr } from "./useLetzmr";

const CELL_HEIGHT = 220;

type NameOf = (id?: string, placeholder?: string) => string;

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function pairLines(name: string): string[] {
  const parts = name
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [name];
}

function initials(name: string): string {
  const first = name.trim().charAt(0);
  return first && /[A-Za-zÀ-ÿ]/.test(first) ? first.toUpperCase() : "?";
}

function sideLabel(match: Match, side: "A" | "B", nameOf: NameOf): string {
  const id = side === "A" ? match.sideAId : match.sideBId;
  const placeholder = side === "A" ? match.placeholderA : match.placeholderB;
  if (match.status === "bye" && !id) return "BYE";
  if (placeholder === "BYE" && !id) return "BYE";
  if (id) return nameOf(id);
  if (placeholder) return placeholder;
  return "Aguardando";
}

function isPlayed(match: Match) {
  return match.status === "played" || match.status === "wo" || match.status === "bye";
}

function ScheduleFields({
  start,
  setStart,
  minutes,
  setMinutes,
  courts,
  setCourts,
  sameTime,
  setSameTime,
  startLabel,
}: {
  start: string;
  setStart: (v: string) => void;
  minutes: string;
  setMinutes: (v: string) => void;
  courts: string;
  setCourts: (v: string) => void;
  sameTime: boolean;
  setSameTime: (v: boolean) => void;
  startLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">{startLabel}</Label>
        <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      {!sameTime && (
        <div className="space-y-1">
          <Label className="text-xs">Minutos por jogo</Label>
          <Input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Quadra (opcional)</Label>
        <Input
          value={courts}
          placeholder="Quadra 1, Quadra 2"
          onChange={(e) => setCourts(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={sameTime} onChange={(e) => setSameTime(e.target.checked)} />
        Todos no mesmo horário
      </label>
    </div>
  );
}

function SideRow({ match, side, nameOf }: { match: Match; side: "A" | "B"; nameOf: NameOf }) {
  const label = sideLabel(match, side, nameOf);
  const id = side === "A" ? match.sideAId : match.sideBId;
  const won = Boolean(id) && id === match.winnerRegistrationId;
  const letter = id ? initials(label) : "?";
  return (
    <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-2 py-2 last:border-b-0">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-xs font-semibold text-[hsl(var(--muted-foreground))]"
        aria-hidden="true"
      >
        {letter}
      </span>
      <div className={`min-w-0 flex-1 ${won ? "font-semibold" : ""}`}>
        {pairLines(label).map((line) => (
          <p key={line} className="truncate leading-tight">
            {line}
          </p>
        ))}
      </div>
      {match.score && !match.score.woSide && (
        <span className="w-8 text-right text-sm font-medium">
          {match.score.sets.map((s) => (side === "A" ? s.gamesA : s.gamesB)).join(" ")}
        </span>
      )}
    </div>
  );
}

function MatchCard({
  match,
  number,
  nameOf,
  onRequestCancel,
  cancelPanel,
  onMessage,
  onError,
  onConflicts,
}: {
  match: Match;
  number: number;
  nameOf: NameOf;
  onRequestCancel: (matchId: string) => void;
  cancelPanel?: ReactNode;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  onConflicts: (conflicts: ScheduleConflict[]) => void;
}) {
  const { run } = useLetzmr();
  const [openSchedule, setOpenSchedule] = useState(false);
  const [when, setWhen] = useState(toLocalInput(match.scheduledAt));
  const [court, setCourt] = useState(match.court ?? "");
  const [draft, setDraft] = useState({ a: "", b: "" });
  const played = isPlayed(match);
  const ready = Boolean(match.sideAId && match.sideBId) && !played;
  const filled = draft.a.trim() !== "" || draft.b.trim() !== "";
  const gamesA = draft.a.trim() === "" ? 0 : Number(draft.a);
  const gamesB = draft.b.trim() === "" ? 0 : Number(draft.b);
  const scoreValid =
    filled &&
    Number.isInteger(gamesA) &&
    Number.isInteger(gamesB) &&
    gamesA >= 0 &&
    gamesB >= 0 &&
    gamesA !== gamesB;

  return (
    <article
      className="w-full rounded-lg border border-[hsl(var(--border))] bg-white text-sm"
      data-testid="ko-match"
    >
      <header className="flex items-center justify-between px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1">
          <Trophy className="h-3 w-3" aria-hidden="true" />#{number}
        </span>
        {match.status !== "bye" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 hover:bg-[hsl(var(--muted))]"
                data-testid="ko-options"
              >
                opções ▾
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpenSchedule((v) => !v)}>
                Programar horário
              </DropdownMenuItem>
              {ready && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      void run((e) => e.recordWo(match.id, "A"))
                        .then(() => onMessage("W.O. para o lado de cima."))
                        .catch((err) => onError(err instanceof Error ? err.message : "Erro"));
                    }}
                  >
                    W.O. para o lado de cima
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void run((e) => e.recordWo(match.id, "B"))
                        .then(() => onMessage("W.O. para o lado de baixo."))
                        .catch((err) => onError(err instanceof Error ? err.message : "Erro"));
                    }}
                  >
                    W.O. para o lado de baixo
                  </DropdownMenuItem>
                </>
              )}
              {played && (
                <DropdownMenuItem onClick={() => onRequestCancel(match.id)}>
                  Cancelar resultado
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <SideRow match={match} side="A" nameOf={nameOf} />
      <SideRow match={match} side="B" nameOf={nameOf} />
      <footer className="border-t border-[hsl(var(--border))] px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
        {match.scheduledAt ? formatScheduleWhen(match.scheduledAt) : "Data e horário a definir"}
        {match.court ? ` · ${match.court}` : ""}
      </footer>
      {openSchedule && (
        <div className="space-y-2 border-t border-[hsl(var(--border))] p-2" data-testid="ko-match-schedule">
          <Input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="Horário do jogo"
          />
          <Input
            value={court}
            placeholder="Quadra (opcional)"
            onChange={(e) => setCourt(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!when}
              onClick={() => {
                void run((e) =>
                  e.scheduleMatch(match.id, new Date(when).toISOString(), court.trim() || undefined),
                )
                  .then(({ conflicts }) => {
                    onConflicts(conflicts);
                    onMessage(
                      conflicts.length
                        ? "Horário salvo com aviso de conflito entre categorias."
                        : "Horário do jogo salvo.",
                    );
                    setOpenSchedule(false);
                  })
                  .catch((err) => onError(err instanceof Error ? err.message : "Erro"));
              }}
            >
              Salvar horário
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpenSchedule(false)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
      {ready && (
        <div className="flex flex-wrap items-center gap-1 border-t border-[hsl(var(--border))] p-2">
          <Input
            className="w-12"
            value={draft.a}
            placeholder="0"
            inputMode="numeric"
            aria-label="Games A"
            onChange={(e) => setDraft((d) => ({ ...d, a: e.target.value }))}
            onFocus={(e) => e.target.select()}
          />
          <span>–</span>
          <Input
            className="w-12"
            value={draft.b}
            placeholder="0"
            inputMode="numeric"
            aria-label="Games B"
            onChange={(e) => setDraft((d) => ({ ...d, b: e.target.value }))}
            onFocus={(e) => e.target.select()}
          />
          <Button
            type="button"
            size="sm"
            disabled={!scoreValid}
            onClick={() => {
              void run((e) => e.recordScore(match.id, [{ gamesA, gamesB }]))
                .then(() => onMessage("Placar lançado."))
                .catch((err) => onError(err instanceof Error ? err.message : "Erro"));
            }}
          >
            Placar
          </Button>
        </div>
      )}
      {cancelPanel}
    </article>
  );
}

/** Chave da eliminatória para o organizador: calendário na rodada e opções em cada jogo. */
export function OrganizerBracket({
  categoryId,
  matches,
  numbers,
  nameOf,
  onRequestCancel,
  cancelPanelFor,
  onMessage,
  onError,
  onConflicts,
}: {
  categoryId: string;
  matches: Match[];
  numbers: Map<string, number>;
  nameOf: NameOf;
  onRequestCancel: (matchId: string) => void;
  cancelPanelFor?: (match: Match) => ReactNode;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  onConflicts: (conflicts: ScheduleConflict[]) => void;
}) {
  const { run } = useLetzmr();
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const columns = rounds.map((round) =>
    matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position),
  );
  const [start, setStart] = useState("");
  const [minutes, setMinutes] = useState("40");
  const [courts, setCourts] = useState("");
  const [sameTime, setSameTime] = useState(true);
  const [busyRound, setBusyRound] = useState<number | null>(null);

  if (columns.length === 0) return null;

  const connected = columns.every(
    (col, i) => i === columns.length - 1 || col.length === columns[i + 1].length * 2,
  );
  const bodyHeight = columns[0].length * CELL_HEIGHT;

  return (
    <div className="overflow-x-auto pb-3" data-testid="organizer-bracket">
      <div className="flex min-w-max">
        {columns.map((col, ci) => {
          const isLast = ci === columns.length - 1;
          const round = rounds[ci];
          const label = knockoutRoundLabel(col.length);
          const openCount = col.filter((m) => !isPlayed(m)).length;
          const minutesN = Number(minutes);
          const valid =
            Boolean(start) && (sameTime || (Number.isInteger(minutesN) && minutesN >= 1));
          return (
            <section key={round} className="w-[20rem] shrink-0" data-testid="ko-column">
              <h2 className="mb-2 flex items-center justify-center gap-1 text-sm font-semibold">
                {label}
                {openCount > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-1 text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]"
                        aria-label={`Programar ${label}`}
                        title={`Programar todos os jogos de ${label}`}
                        data-testid="schedule-round"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[80] w-72" align="center">
                      <p className="mb-2 text-sm font-medium">Programar {label}</p>
                      <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">
                        Define o horário dos {openCount} jogo(s) ainda não disputados desta
                        rodada. Jogos já jogados não mudam.
                      </p>
                      <ScheduleFields
                        start={start}
                        setStart={setStart}
                        minutes={minutes}
                        setMinutes={setMinutes}
                        courts={courts}
                        setCourts={setCourts}
                        sameTime={sameTime}
                        setSameTime={setSameTime}
                        startLabel="Horário"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        disabled={!valid || busyRound !== null}
                        onClick={() => {
                          setBusyRound(round);
                          const courtList = courts
                            .split(",")
                            .map((c) => c.trim())
                            .filter(Boolean);
                          void run((e) =>
                            e.scheduleRound(categoryId, round, {
                              startAt: new Date(start).toISOString(),
                              minutesPerMatch: sameTime ? 1 : minutesN,
                              sameTime,
                              courts: courtList,
                            }),
                          )
                            .then((r) => {
                              onConflicts(r.conflicts);
                              onMessage(
                                `${r.scheduled} jogo(s) de ${label} programado(s)` +
                                  (sameTime ? " no mesmo horário." : ".") +
                                  (r.conflicts.length
                                    ? " Há aviso de conflito com outra categoria."
                                    : ""),
                              );
                            })
                            .catch((err) => onError(err instanceof Error ? err.message : "Erro"))
                            .finally(() => setBusyRound(null));
                        }}
                      >
                        Programar a rodada
                      </Button>
                    </PopoverContent>
                  </Popover>
                )}
              </h2>
              <div className="flex flex-col overflow-visible" style={{ minHeight: bodyHeight }}>
                {col.map((match, mi) => (
                  <div key={match.id} className="relative z-10 flex flex-1 items-center px-6">
                    {connected && ci > 0 && (
                      <span className="absolute left-0 top-1/2 h-px w-6 bg-[hsl(var(--muted-foreground))]/40" />
                    )}
                    <MatchCard
                      match={match}
                      number={numbers.get(match.id) ?? match.position}
                      nameOf={nameOf}
                      onRequestCancel={onRequestCancel}
                      cancelPanel={cancelPanelFor?.(match)}
                      onMessage={onMessage}
                      onError={onError}
                      onConflicts={onConflicts}
                    />
                    {connected && !isLast && (
                      <>
                        <span className="absolute right-0 top-1/2 h-px w-6 bg-[hsl(var(--muted-foreground))]/40" />
                        <span
                          className={
                            "absolute right-0 w-px bg-[hsl(var(--muted-foreground))]/40 " +
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
