/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 7843-8075.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 7843-8075 ----
  function groupHasPublishedScores(category, group) {
    return (group?.matches || []).some(match => !!matchOutcome(match, category.formatPreset));
  }

  // Impressão dos grupos: cada atleta da dupla ocupa a própria linha.
  // A capitalização é aplicada apenas no relatório, sem modificar os cadastros.
  function renderPrintedGroupTeam(name='') {
    const names = splitAthleteNames(name);
    const entries = names.length ? names : ['A definir'];
    return entries.map(person => `<span class="team-person">${escapeHtml(gamesPrintDisplayName(person))}</span>`).join('');
  }

  function buildGroupsPrintHtml(category) {
    const tournamentName = state.meta.tournamentName || 'Torneio';
    const printedAt = formatDateTimeCompact(new Date().toISOString());
    const rankings = allGroupRankings(category);
    const sheets = rankings.map(({ group, ranking }) => {
      const matchRows = group.matches.map((match, index) => {
        const outcome = matchOutcome(match, category.formatPreset);
        return `
          <tr>
            <td class="num">${index + 1}</td>
            <td>${escapeHtml(scheduleSummaryLabel(category, group, match))}</td>
            <td class="print-team-name">${renderPrintedGroupTeam(teamDisplay(category, match.teamA))}</td>
            <td class="num">${escapeHtml(printableScoreLabel(match))}${outcome ? `<div class="small" style="margin-top:3px;font-weight:700">Venc.: ${upperTeamName(teamDisplay(category, outcome.winner))}</div>` : ''}</td>
            <td class="print-team-name">${renderPrintedGroupTeam(teamDisplay(category, match.teamB))}</td>
          </tr>
        `;
      }).join('');
      const hasPublishedScores = groupHasPublishedScores(category, group);
      return `
        <section class="sheet">
          <div class="print-header">
            <div class="print-header-main">
              <img class="brand-logo-print" src="${getTournamentPrintLogo()}" alt="${escapeHtml(getTournamentPrintLogoAlt())}">
              <div>
                <h1 class="print-title">${escapeHtml(tournamentName)}</h1>
              <p class="print-subtitle">Categoria ${escapeHtml(category.name)}</p>
              <div class="meta-line">Grupo ${escapeHtml(group.name.replace(/^Grupo\s+/i, ''))} • Formato ${escapeHtml(formatLabel(category.formatPreset))}</div>
              </div>
            </div>
            ${renderPrintHeaderSide('Fase de grupos', printedAt)}
          </div>
          <div class="section-title">${escapeHtml(group.name).toUpperCase()}</div>
          <table class="print-table compact print-groups-table print-groups-ranking">
            <thead>
              <tr>
                <th class="num">#</th>
                <th>RK</th>
                <th>Jogadores</th>
                <th class="num">Jogos</th>
                <th class="num">Vit.</th>
                <th class="num">Der.</th>
                <th class="num">Sets</th>
                <th class="num">Games</th>
                <th class="num">Classif.</th>
              </tr>
            </thead>
            <tbody>
              ${ranking.map(row => `
                <tr>
                  <td class="num">${row.position}</td>
                  <td class="num">${escapeHtml(row.rankingLabel === 'Sem ranking' ? '0000' : row.rankingLabel)}</td>
                  <td class="print-team-name">${renderPrintedGroupTeam(row.name)}</td>
                  <td class="num">${hasPublishedScores ? row.matchesPlayed : ''}</td>
                  <td class="num">${hasPublishedScores ? row.wins : ''}</td>
                  <td class="num">${hasPublishedScores ? row.losses : ''}</td>
                  <td class="num">${hasPublishedScores ? `${row.setsWon}-${row.setsLost}` : ''}</td>
                  <td class="num">${hasPublishedScores ? `${row.gamesWon}-${row.gamesLost}` : ''}</td>
                  <td class="num">${hasPublishedScores ? `${row.position}º` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="section-title">Jogos do grupo</div>
          <table class="print-table compact print-groups-table print-groups-matches">
            <thead>
              <tr>
                <th class="num">#</th>
                <th>Data/Hora</th>
                <th>Jogadores 01</th>
                <th class="num">Placar</th>
                <th>Jogadores 02</th>
              </tr>
            </thead>
            <tbody>${matchRows}</tbody>
          </table>
        </section>
      `;
    }).join('');
    return sheets;
  }

  function splitGroupsForCompactPrint(rankings) {
    const pages = [];
    let current = [];
    let currentCost = 0;
    const pageCapacity = 6.1;
    rankings.forEach((item) => {
      const teamCount = item.ranking.length || item.group.teams.length || 3;
      const sizeCost = 0.96 + Math.max(0, teamCount - 3) * 0.34;
      const exceedsPage = current.length && ((currentCost + sizeCost) > pageCapacity || current.length >= 5);
      if (exceedsPage) {
        pages.push(current);
        current = [];
        currentCost = 0;
      }
      current.push(item);
      currentCost += sizeCost;
    });
    if (current.length) pages.push(current);
    return pages;
  }


  function buildGroupsCompactPrintHtml(category) {
    const tournamentName = state.meta.tournamentName || 'Torneio';
    const printedAt = formatDateTimeCompact(new Date().toISOString());
    const rankings = allGroupRankings(category);
    const sheets = splitGroupsForCompactPrint(rankings);
    return sheets.map((chunk) => {
      const groupsHtml = chunk.map(({ group, ranking }) => {
        const hasPublishedScores = groupHasPublishedScores(category, group);
        return `
        <section class="groups-only-item">
          <div class="section-title">${escapeHtml(group.name).toUpperCase()}</div>
          <table class="print-table compact groups-only-table print-groups-table">
            <thead>
              <tr>
                <th class="num">#</th>
                <th>RK</th>
                <th>Jogadores</th>
                <th class="num">Jogos</th>
                <th class="num">Vit.</th>
                <th class="num">Der.</th>
                <th class="num">Sets</th>
                <th class="num">Games</th>
                <th class="num">Classif.</th>
              </tr>
            </thead>
            <tbody>
              ${ranking.map(row => `
                <tr>
                  <td class="num">${row.position}</td>
                  <td class="num">${escapeHtml(row.rankingLabel === 'Sem ranking' ? '0000' : row.rankingLabel)}</td>
                  <td class="print-team-name">${renderPrintedGroupTeam(row.name)}</td>
                  <td class="num">${hasPublishedScores ? row.matchesPlayed : ''}</td>
                  <td class="num">${hasPublishedScores ? row.wins : ''}</td>
                  <td class="num">${hasPublishedScores ? row.losses : ''}</td>
                  <td class="num">${hasPublishedScores ? `${row.setsWon}-${row.setsLost}` : ''}</td>
                  <td class="num">${hasPublishedScores ? `${row.gamesWon}-${row.gamesLost}` : ''}</td>
                  <td class="num">${hasPublishedScores ? `${row.position}º` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
      `;}).join('');
      return `
        <section class="sheet groups-only-sheet">
          <div class="print-header">
            <div class="print-header-main">
              <img class="brand-logo-print" src="${getTournamentPrintLogo()}" alt="${escapeHtml(getTournamentPrintLogoAlt())}">
              <div>
                <h1 class="print-title">${escapeHtml(tournamentName)}</h1>
                <p class="print-subtitle">Categoria ${escapeHtml(category.name)}</p>
                <div class="meta-line">Classificação dos grupos • Formato ${escapeHtml(formatLabel(category.formatPreset))}</div>
              </div>
            </div>
            ${renderPrintHeaderSide('Apenas grupos', printedAt)}
          </div>
          <div class="groups-only-stack">${groupsHtml}</div>
        </section>
      `;
    }).join('');
  }

  function buildQualifiedPrintHtml(category) {
    const data = deriveQualified(category);
    if (!data.qualified.length) return '';
    const tournamentName = state.meta.tournamentName || 'Torneio';
    const printedAt = formatDateTimeCompact(new Date().toISOString());
    const rows = data.qualified.slice().sort((a,b) => ((a.seedNumber || 999) - (b.seedNumber || 999)) || (a.isWinner === b.isWinner ? a.sourceGroup.localeCompare(b.sourceGroup, 'pt-BR') : a.isWinner ? -1 : 1));
    return `
      <section class="sheet">
        <div class="print-header">
          <div class="print-header-main">
            <img class="brand-logo-print" src="${getTournamentPrintLogo()}" alt="${escapeHtml(getTournamentPrintLogoAlt())}">
            <div>
              <h1 class="print-title">${escapeHtml(tournamentName)}</h1>
            <p class="print-subtitle">Categoria ${escapeHtml(category.name)}</p>
            <div class="meta-line">Classificados e cabeças de chave</div>
            </div>
          </div>
          ${renderPrintHeaderSide('Classificação', printedAt)}
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th>Seed</th>
              <th>Dupla</th>
              <th>Classificação</th>
              <th>Grupo</th>
              <th class="num">Vitórias</th>
              <th class="num">Saldo Sets</th>
              <th class="num">Saldo Games</th>
              <th class="num">Sets Avg</th>
              <th class="num">Games Avg</th>
              <th>Ranking</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(q => `
              <tr>
                <td>${q.seedNumber ? '#' + q.seedNumber : '—'}</td>
                <td class="print-team-name">${renderTeamNameHtml(q.name)}</td>
                <td>${escapeHtml(q.qualifiedType)}</td>
                <td>${escapeHtml(q.sourceGroup)}</td>
                <td class="num">${q.wins}</td>
                <td class="num">${q.setDiff > 0 ? '+' : ''}${q.setDiff}</td>
                <td class="num">${q.gameDiff > 0 ? '+' : ''}${q.gameDiff}</td>
                <td class="num">${q.setAverage.toFixed(3)}</td>
                <td class="num">${q.gameAverage.toFixed(3)}</td>
                <td>${escapeHtml(q.rankingLabel)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `;
  }



