import {
  categoryFormatLabel,
  groupHasPublishedScores,
  groupPrintWhen,
  printedAtLabel,
  printAthleteNameUpper,
  splitGroupsForCompactPrint,
  splitPrintedAthleteNames,
} from "../../domain/print";
import type { Group, LetzmrStore, StandingRow } from "../../domain/types";
import { createEngine } from "../../store/engine";

function athleteLines(name: string): string[] {
  const people = splitPrintedAthleteNames(name);
  return people.length ? people : ["A definir"];
}

function GroupRankingTable({
  group,
  ranked,
  showScores,
  nameOf,
  when,
}: {
  group: Group;
  ranked: StandingRow[];
  showScores: boolean;
  nameOf: (id: string) => string;
  when: string;
}) {
  return (
    <section className="groups-only-item" data-testid="print-group">
      <div className="group-print-head">
        <div className="section-title">{group.label.toUpperCase()}</div>
        {when ? <div className="group-print-when">{when}</div> : null}
      </div>
      <table className="print-table groups-only-table print-groups-table">
        <tbody>
          {ranked.map((row, i) => {
            const position = row.rank ?? i + 1;
            const athletes = athleteLines(nameOf(row.registrationId));
            return (
              <tr key={row.registrationId}>
                <td className="num">{position}</td>
                <td className="print-team-name">
                  {athletes.map((person, idx) => (
                    <span key={`${person}-${idx}`} className="team-person">
                      {printAthleteNameUpper(person)}
                    </span>
                  ))}
                </td>
                <td className="num">{showScores ? row.played : ""}</td>
                <td className="num">{showScores ? row.wins : ""}</td>
                <td className="num">{showScores ? row.losses : ""}</td>
                <td className="num">{showScores ? `${row.setsFor}-${row.setsAgainst}` : ""}</td>
                <td className="num">{showScores ? `${row.gamesFor}-${row.gamesAgainst}` : ""}</td>
                <td className="num">{showScores ? `${position}º` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** Folha “Apenas grupos”: classificação empilhada, sem confrontos e sem chave. */
export function CategoryPrintView({
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
  const eng = createEngine(store);
  const cat = store.categories.find((c) => c.id === categoryId);
  const groups = store.groups
    .filter((g) => g.categoryId === categoryId)
    .sort((a, b) => a.index - b.index);
  const matches = store.matches.filter((m) => m.categoryId === categoryId);
  const nameOf = (id: string) => eng.regName(id);
  const printedAt = printedAtLabel();
  const items = groups.map((group) => ({
    group,
    ranked: eng.getGroupStandings(group.id).ranked,
    rankingLength: eng.getGroupStandings(group.id).ranked.length,
    showScores: groupHasPublishedScores(matches, group.id),
    when: groupPrintWhen(
      matches.filter((m) => m.groupId === group.id && m.phase === "GROUP").map((m) => m.scheduledAt),
    ),
  }));
  const sheets = splitGroupsForCompactPrint(items);

  if (groups.length === 0) {
    return (
      <article className="sheet" data-testid="print-category">
        <p>Gere os grupos antes de imprimir.</p>
      </article>
    );
  }

  return (
    <>
      {sheets.map((chunk, pageIndex) => (
        <article
          key={`${categoryId}-${pageIndex}`}
          className="sheet groups-only-sheet"
          data-testid="print-category"
        >
          <img className="print-watermark" src="/marca-dagua-mr.png" alt="" />
          <header className="print-header">
            <div className="print-header-main">
              <img className="brand-logo-print" src="/favicon-64.png" alt="" />
              <div>
                <h1 className="print-title">{tournamentName}</h1>
                <p className="print-subtitle">Categoria {categoryName}</p>
                <div className="meta-line">
                  Classificação dos grupos • Formato {categoryFormatLabel(cat?.format)}
                </div>
              </div>
            </div>
            <div className="print-header-side">
              <div className="print-stamp">Impresso em {printedAt}</div>
            </div>
          </header>
          <div className="groups-only-stack">
            {chunk.map((item) => (
              <GroupRankingTable
                key={item.group.id}
                group={item.group}
                ranked={item.ranked}
                showScores={item.showScores}
                nameOf={nameOf}
                when={item.when}
              />
            ))}
          </div>
        </article>
      ))}
    </>
  );
}
