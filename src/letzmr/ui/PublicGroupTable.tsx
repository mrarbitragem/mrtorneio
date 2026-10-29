import { cleanName } from "../domain/names";
import type { StandingRow } from "../domain/types";

const AVATAR_COLORS = [
  "bg-pink-600",
  "bg-purple-600",
  "bg-sky-600",
  "bg-orange-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-emerald-600",
];

function colorFor(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Primeira letra do nome do atleta. */
function initials(name: string): string {
  const first = cleanName(name).charAt(0);
  return first ? first.toUpperCase() : "?";
}

function PairAvatars({ names }: { names: string[] }) {
  return (
    <div className="hidden shrink-0 -space-x-1.5 sm:flex" aria-hidden="true">
      {names.slice(0, 2).map((n) => (
        <span
          key={n}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white ${colorFor(n)}`}
        >
          {initials(n)}
        </span>
      ))}
    </div>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** Cabeçalho e células: colunas alternadas com fundo claro, como numa tabela de torneio. */
const SHADE = "bg-[hsl(var(--muted))]/70";

function Stat({
  main,
  detail,
  shaded,
}: {
  main: string | number;
  detail?: string;
  shaded?: boolean;
}) {
  return (
    <td className={`px-1 py-3 text-center sm:px-2 ${shaded ? SHADE : ""}`}>
      <span className="text-sm sm:text-base">{main}</span>
      {detail && (
        <span className="block whitespace-nowrap text-[10px] text-[hsl(var(--muted-foreground))] sm:ml-1 sm:inline">
          {detail}
        </span>
      )}
    </td>
  );
}

/** Classificação do grupo: posição, jogos, vitórias, derrotas, sets e games. */
export function PublicGroupTable({
  rows,
  nameOf,
}: {
  rows: StandingRow[];
  nameOf: (id?: string) => string;
}) {
  const head = "px-1 py-2 text-xs font-normal sm:px-2 sm:text-sm text-[hsl(var(--muted-foreground))]";
  return (
    <div className="overflow-x-auto" data-testid="group-table">
      <table className="w-full sm:min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))]">
            <th className={`${head} text-left`}>Dupla</th>
            <th className={`${head} text-center ${SHADE}`}><span className="hidden sm:inline">Posição</span><span className="sm:hidden">Pos.</span></th>
            <th className={`${head} text-center`}><span className="hidden sm:inline">Jogos</span><span className="sm:hidden">J</span></th>
            <th className={`${head} text-center ${SHADE}`}><span className="hidden sm:inline">Vitórias</span><span className="sm:hidden">V</span></th>
            <th className={`${head} text-center`}><span className="hidden sm:inline">Derrotas</span><span className="sm:hidden">D</span></th>
            <th className={`${head} text-center ${SHADE}`}>Sets</th>
            <th className={`${head} text-center`}>Games</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = nameOf(row.registrationId);
            const names = name
              .split(" / ")
              .map((p) => p.trim())
              .filter(Boolean);
            return (
              <tr
                key={row.registrationId}
                className="border-b border-[hsl(var(--border))]"
                data-testid="place-row"
              >
                <td className="py-3 pr-1 sm:px-2">
                  <div className="flex items-center gap-3">
                    <PairAvatars names={names} />
                    <div className="min-w-0">
                      {(names.length ? names : ["A definir"]).map((line) => (
                        <p key={line} className="text-sm leading-tight sm:text-base">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </td>
                <Stat main={row.rank ? `${row.rank}º` : "—"} shaded />
                <Stat main={row.played} />
                <Stat main={row.wins} shaded />
                <Stat main={row.losses} />
                <Stat
                  main={signed(row.setDiff)}
                  detail={`${row.setsFor} / ${row.setsAgainst}`}
                  shaded
                />
                <Stat
                  main={signed(row.gameDiff)}
                  detail={`${row.gamesFor} / ${row.gamesAgainst}`}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
