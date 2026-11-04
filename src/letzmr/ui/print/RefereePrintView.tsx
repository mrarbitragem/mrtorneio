import {
  formatRefereeTime,
  gamesPrintCategoryCode,
  gamesPrintDisplayName,
  groupPrintGames,
  type PrintGame,
} from "../../domain/print";

/** Folha do dia para árbitros: todas as categorias, por horário. */
export function RefereePrintView({
  games,
  showScores,
}: {
  games: PrintGame[];
  showScores: boolean;
}) {
  const codes = new Map<string, string>();
  for (const game of games) {
    if (!codes.has(game.categoryId)) {
      codes.set(game.categoryId, gamesPrintCategoryCode(game.categoryName));
    }
  }
  const sections = groupPrintGames(games);

  if (games.length === 0) {
    return (
      <article className="sheet" data-testid="print-referee">
        <p>Nenhum jogo para imprimir com os filtros atuais.</p>
      </article>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <article
          key={section.dateKey || "undated"}
          className="sheet games-list-sheet"
          data-testid="print-referee"
        >
          <img className="print-watermark" src="/marca-dagua-mr.png" alt="" />
          <table className="gl-table">
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>HORA</th>
                <th>CAT</th>
                <th>FASE</th>
                <th>JOGADOR(ES) 01</th>
                <th>JOGADOR(ES) 02</th>
                <th>RESULTADO</th>
              </tr>
            </thead>
            <tbody>
              {section.blocks.flatMap((block) =>
                block.rows.map((row) => (
                  <tr
                    key={row.game.id}
                    className={`gl-game-row${row.groupStart ? " gl-group-start" : ""}`}
                  >
                    {row.timeSpan != null && (
                      <td className="gl-time gl-merged" rowSpan={row.timeSpan}>
                        {formatRefereeTime(row.game.time)}
                      </td>
                    )}
                    {row.categorySpan != null && (
                      <td className="gl-category gl-merged" rowSpan={row.categorySpan}>
                        {codes.get(row.game.categoryId) || "CAT"}
                      </td>
                    )}
                    {row.phaseSpan != null && (
                      <td className="gl-phase gl-merged" rowSpan={row.phaseSpan}>
                        {row.game.phase}
                      </td>
                    )}
                    <td className="gl-team">{gamesPrintDisplayName(row.game.teamA)}</td>
                    <td className="gl-team">{gamesPrintDisplayName(row.game.teamB)}</td>
                    <td className="gl-result">{showScores ? row.game.score : ""}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </article>
      ))}
    </>
  );
}
