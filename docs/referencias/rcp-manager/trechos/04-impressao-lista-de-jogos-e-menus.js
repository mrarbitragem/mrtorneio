/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 8312-8798.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 8312-8798 ----


  // Fila impressa independente da Mesa de Operação: inclui inclusive partidas concluídas.
  // A consulta não cria partidas, não altera placares e não modifica os horários existentes.
  const gamesPrintFilter = { categoryIds:new Set(), dateKeys:new Set(), allDays:false, includeUnscheduled:false, showScores:false };

  function collectGamesForPrinting() {
    const games = [];
    state.categories.forEach((category, categoryOrder) => {
      (category.groups || []).forEach((group, groupOrder) => {
        (group.matches || []).forEach((match, matchOrder) => {
          const dateTime = effectiveSchedule(category, group, match);
          // No relatório, cada grupo é identificado numericamente na ordem cadastrada:
          // Grupo A, Grupo B, Grupo C ... tornam-se G1, G2, G3 ...
          // Não modificamos o nome salvo nem as outras telas do torneio.
          games.push({
            categoryId:category.id, categoryName:category.name, categoryOrder,
            phase:`G${groupOrder+1}`, phaseOrder:groupOrder,
            phaseGroupKey:group.id || `grupo-${groupOrder}`,
            dateTime, dateKey:dateTime.slice(0,10), time:dateTime ? dateTime.slice(11,16) : '',
            court:match.court || '',
            teamA:teamDisplay(category, match.teamA), teamB:teamDisplay(category, match.teamB),
            score:printableScoreLabel(match), sourceNumber:match.sourceMatchNumber || '', matchOrder,
            id:match.id, source:'group'
          });
        });
      });
      // A eliminatória entra apenas quando já existe e foi confirmada; não imprimimos BYEs.
      if (category.groupStageConfirmed && category.elimination?.rounds) {
        category.elimination.rounds.forEach((round, phaseOrder) => {
          (round.matches || []).forEach((match, matchOrder) => {
            if (knockoutMatchOutcome(match, category.formatPreset).status === 'bye') return;
            const dateTime = effectiveSchedule(category, null, match);
            // Confrontos de fases futuras sem equipes e sem agendamento não são partidas operacionais.
            if (!dateTime && !match.sideA?.id && !match.sideB?.id) return;
            const name = String(round.name || 'Eliminatória');
            const phase = /quart/i.test(name) ? 'QF' : /semi/i.test(name) ? 'SF' : /final/i.test(name) ? 'F' : name.length <= 7 ? name.toUpperCase() : `E${phaseOrder+1}`;
            games.push({
              categoryId:category.id, categoryName:category.name, categoryOrder,
              phase, phaseOrder:100+phaseOrder,
              phaseGroupKey:round.id || `eliminatoria-${phaseOrder}`,
              dateTime, dateKey:dateTime.slice(0,10), time:dateTime ? dateTime.slice(11,16) : '',
              court:match.court || '',
              teamA:match.sideA?.name || 'A definir', teamB:match.sideB?.name || 'A definir',
              score:printableScoreLabel(match), sourceNumber:match.sourceMatchNumber || '', matchOrder,
              id:match.id, source:'ko'
            });
          });
        });
      }
    });
    // Ordenação cronológica; dentro de um horário, mantemos categoria/grupo/jogo juntos.
    return games.sort((a,b) => {
      if (!a.dateTime && b.dateTime) return 1;
      if (a.dateTime && !b.dateTime) return -1;
      if (a.dateTime !== b.dateTime) return a.dateTime.localeCompare(b.dateTime);
      return a.categoryOrder-b.categoryOrder || a.phaseOrder-b.phaseOrder || a.matchOrder-b.matchOrder;
    });
  }

  function gamesPrintDateLabel(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Sem data definida';
    const [year,month,date] = day.split('-').map(Number);
    return new Date(year,month-1,date).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
  }

  function gamesPrintTodayKey() {
    const now=new Date();
    return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  }

  function gamesPrintFiltered() {
    return collectGamesForPrinting().filter(game =>
      gamesPrintFilter.categoryIds.has(game.categoryId) &&
      (game.dateKey
        ? (gamesPrintFilter.allDays || gamesPrintFilter.dateKeys.has(game.dateKey))
        : gamesPrintFilter.includeUnscheduled)
    );
  }

  function renderGamesPrintOptions() {
    if (!el.gamesPrintBackdrop || el.gamesPrintBackdrop.classList.contains('hidden')) return;
    const allGames=collectGamesForPrinting();
    el.gamesPrintCategoryOptions.innerHTML = state.categories.map(category => {
      const count=allGames.filter(game=>game.categoryId===category.id).length;
      return `<label class="game-print-option"><input type="checkbox" data-games-print-category="${escapeHtml(category.id)}" ${gamesPrintFilter.categoryIds.has(category.id)?'checked':''}><span>${escapeHtml(category.name)}</span><small>${count} jogos</small></label>`;
    }).join('') || '<div class="game-print-empty">Nenhuma categoria cadastrada.</div>';
    const categoryGames=allGames.filter(game=>gamesPrintFilter.categoryIds.has(game.categoryId));
    const dates=[...new Set(categoryGames.map(game=>game.dateKey).filter(Boolean))].sort();
    el.gamesPrintDateOptions.innerHTML=dates.map(day=>{
      const count=categoryGames.filter(game=>game.dateKey===day).length;
      const checked=gamesPrintFilter.allDays || gamesPrintFilter.dateKeys.has(day);
      return `<label class="game-print-option"><input type="checkbox" data-games-print-date="${day}" ${checked?'checked':''}><span>${escapeHtml(gamesPrintDateLabel(day))}</span><small>${count} jogos</small></label>`;
    }).join('') || '<div class="game-print-empty">Nenhuma data agendada nas categorias selecionadas.</div>';
    const btn= document.getElementById('gamesPrintAllDaysBtn');
    if(btn){btn.classList.toggle('secondary',gamesPrintFilter.allDays);btn.classList.toggle('ghost',!gamesPrintFilter.allDays);}
    if(el.gamesPrintUnscheduled)el.gamesPrintUnscheduled.checked=gamesPrintFilter.includeUnscheduled;
    if(el.gamesPrintScores)el.gamesPrintScores.checked=gamesPrintFilter.showScores;
    const selected=gamesPrintFiltered();
    const selectedCategories=state.categories.filter(c=>gamesPrintFilter.categoryIds.has(c.id)).length;
    const selectedDates=new Set(selected.filter(g=>g.dateKey).map(g=>g.dateKey)).size;
    const undated=selected.filter(g=>!g.dateKey).length;
    el.gamesPrintPreview.innerHTML = `<strong>${selected.length} partida(s)</strong> para imprimir • ${selectedCategories} categoria(s) • ${selectedDates} dia(s) agendado(s)${undated?` • ${undated} sem data`:''}.<br><span class="muted">A4 em pé, fonte 8–9 pt, primeiro e último nome, sem quadra. Siglas: DX = mista, DM = masculina, DF = feminina. Você também pode salvar como PDF.</span>`;
    if(el.gamesPrintGenerateBtn)el.gamesPrintGenerateBtn.disabled=!selected.length;
  }

  let gamesPrintMode = 'desk';
  function openGamesPrintDialog(options={}) {
    gamesPrintMode = options.fromGroups ? 'referee' : 'desk';
    const allGames=collectGamesForPrinting();
    if(!allGames.length){setStatus('Nenhum jogo foi cadastrado para imprimir.', 'warn');return;}
    gamesPrintFilter.categoryIds=new Set(state.categories.map(c=>c.id));
    gamesPrintFilter.allDays=false;
    gamesPrintFilter.dateKeys=new Set();
    gamesPrintFilter.includeUnscheduled=false;
    gamesPrintFilter.showScores=false;
    const deskFilter=operationDeskFilterState();
    if(options.fromGroups && activeCategory()) gamesPrintFilter.categoryIds=new Set([activeCategory().id]);
    else if(deskFilter.categoryId==='active' && activeCategory()) gamesPrintFilter.categoryIds=new Set([activeCategory().id]);
    else if(state.categories.some(c=>c.id===deskFilter.categoryId)) gamesPrintFilter.categoryIds=new Set([deskFilter.categoryId]);
    const dates=[...new Set(allGames.filter(g=>gamesPrintFilter.categoryIds.has(g.categoryId)).map(g=>g.dateKey).filter(Boolean))].sort();
    const today=gamesPrintTodayKey();
    const startDay=dates.includes(deskFilter.date) ? deskFilter.date : (dates.includes(today)?today:dates[0]);
    if(startDay)gamesPrintFilter.dateKeys.add(startDay);
    else gamesPrintFilter.includeUnscheduled=true;
    const heading = document.getElementById('gamesPrintTitle');
    if (heading) heading.textContent = gamesPrintMode === 'referee' ? 'Imprimir para árbitros' : 'Filtrar jogos para impressão';
    el.gamesPrintBackdrop.classList.remove('hidden');
    el.gamesPrintBackdrop.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    renderGamesPrintOptions();
    document.getElementById('gamesPrintCloseBtn')?.focus();
  }

  function closeGamesPrintDialog() {
    el.gamesPrintBackdrop?.classList.add('hidden');
    el.gamesPrintBackdrop?.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    if (gamesPrintMode === 'referee') document.querySelector('#groupsPrintMenu summary')?.focus();
    else el.openGamesPrintBtn?.focus();
  }

  // Siglas padronizadas exclusivamente para a lista de jogos impressa.
  // DF = dupla feminina; DM = dupla masculina; DX = dupla mista.
  // Ex.: Dupla Feminina C => DFC; Dupla Masculina D => DMD;
  //      Dupla Mista D => DXD; Mista Iniciante => DXI.
  function gamesPrintCategoryCode(name='') {
    const clean=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
      .replace(/[^A-Z0-9+ ]/g,' ').replace(/\s+/g,' ').trim();
    const gender= /\b(?:MIST[AO]S?|MIXTO?S?)\b/.test(clean) ? 'X'
      : /\bMASCULIN[AO]S?\b/.test(clean) ? 'M'
      : /\bFEMININ[AO]S?\b/.test(clean) ? 'F' : '';
    if (gender) {
      // Classe por letra (A, B, C, D, ...), independentemente de "Dupla" no título.
      const tokens=clean.split(' ');
      const grade=tokens.find(word=>/^[A-Z]$/.test(word));
      const level=grade || (/\bINICIANTES?\b/.test(clean) ? 'I' :
        /\bINTERMEDIARI[AO]S?\b/.test(clean) ? 'INT' :
        /\bAVANCAD[AO]S?\b/.test(clean) ? 'AV' :
        /\bOPEN\b/.test(clean) ? 'OPEN' :
        /\bLIVRE\b/.test(clean) ? 'L' : '');
      if(level)return `D${gender}${level}`;
    }
    // Categorias fora desses três formatos continuam com código gerado do título.
    const words=clean.split(' ').filter(Boolean);
    return (words.length===1?words[0].slice(0,5):words.map(word=>word[0]).join('').slice(0,5))||'CAT';
  }

  function gamesPrintCategoryCodes(games) {
    const map=new Map();
    games.forEach(game=>{
      if(!map.has(game.categoryId)) map.set(game.categoryId, gamesPrintCategoryCode(game.categoryName));
    });
    return map;
  }

  // Capitalização própria do impresso: converte nomes vindos em CAIXA ALTA
  // para a forma convencional, sem mexer no cadastro original.
  function gamesPrintDisplayName(value) {
    const smallWords = new Set(['da','das','de','do','dos','e']);
    const source = String(value ?? '').toLocaleLowerCase('pt-BR');
    return source.replace(/[\p{L}]+/gu, (word, pos) => {
      const leading = source.slice(0,pos);
      const beginning = !leading.trim() || /[\/|]\s*$/.test(leading);
      if (!beginning && smallWords.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
    });
  }

  // Apenas para a lista impressa da Mesa de Operação. Nunca altera os nomes no cadastro.
  // Cada integrante da dupla fica com seu primeiro e último nome.
  function gamesPrintShortAthleteName(name='') {
    const conventional = gamesPrintDisplayName(String(name || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim());
    if (!conventional) return '';
    if (/^(a definir|bye)$/i.test(conventional)) return conventional;
    const words = conventional.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return conventional;
    return `${words[0]} ${words[words.length - 1]}`;
  }

  function gamesPrintShortTeamName(value='') {
    return String(value || '').split(/\s*\/\s*/).map(gamesPrintShortAthleteName).filter(Boolean).join(' / ');
  }

  function buildGamesListPrintHtml(filteredGames, showScores=false, forReferees=false) {
    const codes=gamesPrintCategoryCodes(filteredGames);
    const categoryLegend=state.categories.filter(c=>codes.has(c.id)).map(c=>`${codes.get(c.id)} = ${c.name}`).join('  •  ');
    const printedAt=formatDateTimeCompact(new Date().toISOString());
    const tournament=state.meta.tournamentName || 'Torneio';
    // A lista usa células unificadas (rowspan), iguais ao modelo da mesa de operação:
    // Hora / Categoria abrangem uma sequência, Fase abrange todos os confrontos
    // daquele grupo. A quadra não entra no agrupamento, pois não é exibida nesta lista.
    // Os blocos de horário são limitados para não criar células gigantes ao paginar.
    const maxHourBlock = 18;
    const parts = [];
    const dayCounts = new Map();
    filteredGames.forEach(game => {
      const key = game.dateKey || '';
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    });
    const sameUnit = (a,b) => a && b &&
      (a.dateKey || '') === (b.dateKey || '') &&
      a.time === b.time &&
      a.categoryId === b.categoryId && a.phase === b.phase &&
      (a.phaseGroupKey || a.phase) === (b.phaseGroupKey || b.phase);
    const sameHour = (a,b) => a && b &&
      (a.dateKey || '') === (b.dateKey || '') &&
      a.time === b.time;
    const makeTimeCell = (game, span) =>
      `<td class="gl-time gl-merged" rowspan="${span}">${escapeHtml(game.time || '—')}</td>`;
    let offset=0;
    while (offset < filteredGames.length) {
      const day = filteredGames[offset].dateKey || '';
      let dayEnd=offset;
      while (dayEnd < filteredGames.length && (filteredGames[dayEnd].dateKey || '')===day) dayEnd++;
      parts.push(`<tbody class="gl-day-body"><tr class="gl-day-row"><th colspan="7">${escapeHtml(day ? gamesPrintDateLabel(day) : 'SEM DATA DEFINIDA')} <span>• ${dayCounts.get(day)} jogo(s)</span></th></tr></tbody>`);
      let cursor=offset;
      while (cursor < dayEnd) {
        // Agrupamos primeiro todos os jogos da mesma fase/grupo sem alterar
        // a ordem de programação. As unidades são indivisíveis para o cálculo
        // do limite do bloco, portanto G1 com 3 partidas permanece G1/rowspan=3.
        const units=[];
        let scan=cursor, total=0;
        const first=filteredGames[cursor];
        while (scan < dayEnd) {
          const current=filteredGames[scan];
          if (!sameHour(current,first)) break;
          let to=scan+1;
          while (to < dayEnd && sameUnit(filteredGames[to],current)) to++;
          const qty=to-scan;
          if (total && total+qty>maxHourBlock) break;
          units.push({start:scan,end:to,game:current,count:qty});
          total+=qty;
          scan=to;
        }
        if (!units.length) throw new Error('Erro ao agrupar horários na lista de impressão.');
        const catSpans=new Map();
        for (let ui=0;ui<units.length;) {
          let next=ui+1, count=units[ui].count;
          while(next<units.length && units[next].game.categoryId===units[ui].game.categoryId) {
            count+=units[next].count; next++;
          }
          catSpans.set(ui,count);
          ui=next;
        }
        parts.push('<tbody class="gl-hour-body">');
        let globalStart=0;
        units.forEach((unit,ui)=>{
          for (let i=unit.start;i<unit.end;i++) {
            const game=filteredGames[i];
            let left='';
            if (globalStart===0) left+=makeTimeCell(game,total);
            if (catSpans.has(ui) && i===unit.start) {
              left+=`<td class="gl-category gl-merged" rowspan="${catSpans.get(ui)}">${escapeHtml(codes.get(game.categoryId)||'CAT')}</td>`;
            }
            if (i===unit.start) left+=`<td class="gl-phase gl-merged" rowspan="${unit.count}">${escapeHtml(game.phase)}</td>`;
            parts.push(`<tr class="gl-game-row${i===unit.start?' gl-group-start':''}">
              ${left}
              <td class="gl-number">${i+1}</td>
              <td class="gl-team">${escapeHtml(gamesPrintShortTeamName(game.teamA))}</td>
              <td class="gl-team">${escapeHtml(gamesPrintShortTeamName(game.teamB))}</td>
              <td class="gl-result">${showScores?escapeHtml(game.score||''):''}</td>
            </tr>`);
            globalStart++;
          }
        });
        parts.push('</tbody>');
        cursor=scan;
      }
      offset=dayEnd;
    }
    return `<style>
      /* Layout exclusivo da lista operacional: não afeta os outros relatórios do RCP. */
      .games-list-sheet{
        padding:0!important; min-height:0!important;
        overflow:visible!important;page-break-inside:auto!important;break-inside:auto!important;
        width:calc(210mm - 10mm)!important;max-width:100%!important;
      }
      .gl-header{display:flex;align-items:center;justify-content:space-between;gap:7px;
        margin:0 0 3px;padding:0 0 3px;border-bottom:1px solid #777}
      .gl-heading{display:flex;align-items:center;gap:7px;min-width:0}
      .gl-heading img{width:auto;max-width:9mm;max-height:9mm;object-fit:contain}
      .gl-heading img[src=""]{display:none}
      .gl-heading h1{margin:0 0 2px;font-size:11pt;font-weight:800;line-height:1.08}
      .gl-heading .gl-subtitle{font-size:8pt;font-weight:700;line-height:1.1}
      .gl-header-count{text-align:right;min-width:70px;font-size:7.2pt}
      .gl-header-count strong{display:block;font-size:8.5pt}
      .gl-header-count small{display:block;font-size:7pt;line-height:1.2;color:#444}
      .gl-legend{font-size:7.3pt;color:#333;line-height:1.2;margin:0 0 3px;
        overflow-wrap:break-word}
      .gl-table{border-collapse:collapse;width:100%;table-layout:fixed;min-width:0!important;
        font-family:Arial,Helvetica,sans-serif;margin:0}
      .gl-table thead{display:table-header-group}
      .gl-table th,.gl-table td{border:0.45pt solid #808080;color:#111!important;
        background:#fff!important;vertical-align:middle;padding:1.5px 2.5px;
        font-size:8.4pt;line-height:1.12;overflow-wrap:anywhere;word-break:normal}
      .gl-table thead th{background:#e9edf1!important;color:#111!important;
        font-weight:800;text-align:left;font-size:7.6pt;line-height:1.08;
        padding:3px 2px;position:static;white-space:normal}
      .gl-table thead th:nth-child(-n+4){text-align:center}
      .gl-table tr.gl-game-row{height:5mm;break-inside:avoid;page-break-inside:avoid}
      .gl-table .gl-time,.gl-table .gl-category,.gl-table .gl-phase,.gl-table .gl-number{
        text-align:center;font-weight:700;font-size:8pt}
      .gl-table .gl-merged{vertical-align:middle!important;text-align:center}
      .gl-table .gl-group-start td:not(.gl-merged){border-top-color:#555}
      .gl-table .gl-hour-body{break-inside:auto;page-break-inside:auto}
      .gl-table .gl-day-body{break-inside:avoid;page-break-inside:avoid}
      .gl-table .gl-team{font-weight:500;text-transform:none!important;letter-spacing:normal!important}
      .gl-table .gl-result{text-align:center;font-weight:700;font-size:8pt}
      .gl-table .gl-day-row{break-inside:avoid;break-after:avoid;page-break-after:avoid}
      .gl-table .gl-day-row th{background:#dce5ed!important;color:#111!important;
        font-size:8pt;text-align:left;letter-spacing:.01em;
        padding:3px 5px;font-weight:800;border-color:#777}
      .gl-table .gl-day-row span{font-size:7.4pt;font-weight:500}
      .gl-footer{margin-top:3px;font-size:7pt;color:#555;text-align:right}
      @media print{
        .games-list-sheet{box-shadow:none!important;margin:0!important;width:100%!important;
          min-height:0!important;break-inside:auto!important;page-break-inside:auto!important}
        .gl-table thead{display:table-header-group!important}
        .gl-table tr.gl-game-row{break-inside:avoid!important;page-break-inside:avoid!important}
        .gl-table .gl-day-row{break-after:avoid!important;page-break-after:avoid!important}
        .gl-table th,.gl-table td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }
    </style><section class="sheet games-list-sheet">
      <header class="gl-header">
        <div class="gl-heading"><img src="${getTournamentPrintLogo()}" alt=""/><div>
          <h1>${escapeHtml(tournament)}</h1><div class="gl-subtitle">${forReferees ? 'LISTA DE JOGOS • ÁRBITROS' : 'LISTA DE JOGOS • PROGRAMAÇÃO DO TORNEIO'}</div>
        </div></div>
        <div class="gl-header-count"><strong>${filteredGames.length} JOGOS</strong>
          <small>Impresso: ${escapeHtml(printedAt)}</small></div>
      </header>
      <div class="gl-legend">${escapeHtml(categoryLegend)}</div>
      <table class="gl-table">
        <colgroup><col style="width:8%"><col style="width:7%"><col style="width:6%"><col style="width:4%"><col style="width:31.5%"><col style="width:31.5%"><col style="width:12%"></colgroup>
        <thead><tr><th>HORA</th><th>CAT.</th><th>FASE</th><th>Nº</th><th>JOGADOR(ES) 01</th><th>JOGADOR(ES) 02</th><th>RESULTADO</th></tr></thead>
        <tbody>${parts.join('')}</tbody>
      </table>
      <div class="gl-footer">RCP Manager • DF = feminina · DM = masculina · DX = mista</div>
    </section>`;
  }

  function printSelectedGames() {
    const games=gamesPrintFiltered();
    if(!games.length){setStatus('Selecione pelo menos uma categoria e um dia com jogos antes de imprimir.', 'warn');renderGamesPrintOptions();return;}
    const refereeMode = gamesPrintMode === 'referee';
    const html=buildGamesListPrintHtml(games,gamesPrintFilter.showScores,refereeMode);
    const title=`${refereeMode ? 'Lista para árbitros' : 'Lista de jogos'} - ${state.meta.tournamentName || 'Torneio'}`;
    closeGamesPrintDialog();
    printWindowDocument(title,html,{landscape:false,compactGames:true});
  }

  function printGroupsView() {
    const category = activeCategory();
    if (!category || !category.groups.length) {
      setStatus('Abra uma categoria com grupos para imprimir.', 'warn');
      return;
    }
    printWindowDocument(`Grupos - ${category.name}`, buildGroupsPrintHtml(category));
  }

  function printGroupsCompactView() {
    const category = activeCategory();
    if (!category || !category.groups.length) {
      setStatus('Abra uma categoria com grupos para imprimir.', 'warn');
      return;
    }
    printWindowDocument(`Grupos - ${category.name} (apenas grupos)`, buildGroupsCompactPrintHtml(category));
  }

  // Apenas os grupos de várias categorias, reutilizando o modelo já aprovado.
  let multipleGroupsPrintSelectedIds = new Set();
  function availableMultipleGroupsPrintCategories() {
    return state.categories.filter(category => Array.isArray(category.groups) && category.groups.length > 0);
  }
  function refreshMultipleGroupsPrintSummary() {
    const available = availableMultipleGroupsPrintCategories();
    const selected = available.filter(category => multipleGroupsPrintSelectedIds.has(String(category.id)));
    const groupsCount = selected.reduce((sum, category) => sum + category.groups.length, 0);
    const summary = document.getElementById('multipleGroupsPrintSummary');
    const generate = document.getElementById('multipleGroupsPrintGenerateBtn');
    if (summary) summary.textContent = selected.length
      ? `${selected.length} categoria(s) selecionada(s) • ${groupsCount} grupo(s). Impressão em A4 vertical, com cada atleta em sua linha.`
      : 'Selecione ao menos uma categoria que já tenha grupos formados.';
    if (generate) generate.disabled = selected.length === 0;
  }
  function renderMultipleGroupsPrintOptions() {
    const list = document.getElementById('multipleGroupsPrintChoices');
    if (!list) return;
    const availableIds = new Set(availableMultipleGroupsPrintCategories().map(category => String(category.id)));
    list.innerHTML = !state.categories.length
      ? '<div class="empty" style="padding:16px">Nenhuma categoria cadastrada.</div>'
      : state.categories.map(category => {
          const enabled = availableIds.has(String(category.id));
          const checked = enabled && multipleGroupsPrintSelectedIds.has(String(category.id));
          return `<label class="multi-groups-option ${enabled ? '' : 'is-disabled'}">
            <input type="checkbox" data-multi-groups-category-id="${escapeHtml(String(category.id))}" ${checked ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
            <span>${escapeHtml(category.name)}</span>
            <small>${enabled ? `${category.groups.length} grupo(s)` : 'Sem grupos'}</small>
          </label>`;
        }).join('');
    list.querySelectorAll('[data-multi-groups-category-id]').forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) multipleGroupsPrintSelectedIds.add(input.dataset.multiGroupsCategoryId);
        else multipleGroupsPrintSelectedIds.delete(input.dataset.multiGroupsCategoryId);
        refreshMultipleGroupsPrintSummary();
      });
    });
    refreshMultipleGroupsPrintSummary();
  }
  function openMultipleGroupsPrintDialog() {
    const available = availableMultipleGroupsPrintCategories();
    if (!available.length) {
      setStatus('Nenhuma categoria com grupos formados para imprimir.', 'warn');
      return;
    }
    const activeId = activeCategory()?.id;
    multipleGroupsPrintSelectedIds = new Set(activeId && available.some(category => category.id === activeId) ? [String(activeId)] : []);
    renderMultipleGroupsPrintOptions();
    const backdrop = document.getElementById('multipleGroupsPrintBackdrop');
    backdrop?.classList.remove('hidden');
    backdrop?.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    document.getElementById('multipleGroupsPrintGenerateBtn')?.focus();
  }
  function closeMultipleGroupsPrintDialog() {
    const backdrop = document.getElementById('multipleGroupsPrintBackdrop');
    backdrop?.classList.add('hidden');
    backdrop?.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }
  function printMultipleCategoriesGroupsOnly() {
    const selected = availableMultipleGroupsPrintCategories().filter(category => multipleGroupsPrintSelectedIds.has(String(category.id)));
    if (!selected.length) {
      setStatus('Escolha pelo menos uma categoria para imprimir.', 'warn');
      refreshMultipleGroupsPrintSummary();
      return;
    }
    const html = selected.map(category => buildGroupsCompactPrintHtml(category)).join('');
    // O mesmo HTML impresso da função “Apenas grupos” preserva tabelas,
    // fonte reduzida, quebra de linha dos atletas e paginação por categoria.
    closeMultipleGroupsPrintDialog();
    printWindowDocument(`Apenas grupos — ${selected.length} categorias`, html, { landscape:false });
  }

  function printQualifiedView() {
    const category = activeCategory();
    const html = category ? buildQualifiedPrintHtml(category) : '';
    if (!html) {
      setStatus('Complete a fase de grupos antes de imprimir a classificação.', 'warn');
      return;
    }
    printWindowDocument(`Classificação - ${category.name}`, html);
  }

  function printBracketView() {
    try {
      const category = activeCategory();
      const html = category ? buildBracketPrintHtml(category) : '';
      if (!html) {
        setStatus('Complete a fase de grupos e gere a eliminatória antes de imprimir a chave.', 'warn');
        return;
      }
      printWindowDocument(`Eliminatória - ${category.name}`, html, { landscape: false, bracketWide: true });
    } catch (error) {
      console.error('Erro ao preparar a impressão da eliminatória:', error);
      setStatus('Não foi possível preparar a impressão da eliminatória.', 'error');
    }

