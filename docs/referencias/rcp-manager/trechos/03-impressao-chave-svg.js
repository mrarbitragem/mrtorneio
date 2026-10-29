/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 8076-8311.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 8076-8311 ----
  function buildBracketPrintHtml(category) {
    const data = buildBracket(category);
    if (!data.bracket) return '';

    const tournamentName = state.meta.tournamentName || 'Torneio';
    const printedAt = formatDateTimeCompact(new Date().toISOString());
    const rounds = data.bracket.rounds || [];
    const roundCount = rounds.length || 1;
    const firstRoundMatches = rounds[0]?.matches?.length || 1;
    const participantCount = Math.max(2, firstRoundMatches * 2);
    const registeredDoubles = Array.isArray(category.participants) ? category.participants.length : null;

    const shortRound = (name, index) => {
      const upper = String(name || '').toLocaleUpperCase('pt-BR');
      if (upper.includes('16') || upper.includes('OIT')) return 'R16';
      if (upper.includes('8') || upper.includes('QUART')) return 'QF';
      if (upper.includes('4') || upper.includes('SEMI')) return 'SF';
      if (upper.includes('FINAL')) return 'FINAL';
      return `R${index + 1}`;
    };
    const compactOrigin = (raw='') => {
      const value = String(raw || '').trim();
      const second = value.match(/^2[ºo]\s+da\s+(\d+)[ªa]\s+melhor\s+campanha$/i);
      if (second) return `2º DA ${Number(second[1])}ª MC`;
      const campaign = value.match(/^(\d+)[ªa]\s+melhor\s+campanha$/i);
      if (campaign) return `${Number(campaign[1])}ª MC`;
      return value.replace(/grupo\s+/gi, 'G').toLocaleUpperCase('pt-BR');
    };
    const formatPersonPrint = (raw='', maxChars=30, initial=false) => {
      const original = compactOrigin(raw).replace(/\s+/g, ' ').trim();
      if (!original) return '';
      if (/^(BYE|A DEFINIR|\d+[ºª]\s.*MC)$/i.test(original)) return original;
      const tokens = original.split(' ').filter(Boolean);
      if (initial && tokens.length > 1) {
        const candidate = `${tokens[0][0]}. ${tokens[tokens.length - 1]}`;
        if (candidate.length <= maxChars) return candidate;
      }
      if (original.length <= maxChars) return original;
      const firstLast = `${tokens[0]} ${tokens[tokens.length - 1]}`;
      if (firstLast.length <= maxChars) return firstLast;
      return `${tokens[0][0]}. ${tokens[tokens.length - 1]}`;
    };
    const teamLineNames = (raw='', opts={}) => {
      const name = compactOrigin(raw || 'A DEFINIR') || 'A DEFINIR';
      if (/^(BYE|A DEFINIR)$/i.test(name)) return [name];
      return name.split('/').map(v => formatPersonPrint(v.trim(), opts.maxChars || 29, !!opts.initial)).filter(Boolean).slice(0, 2);
    };
    const scoreLabel = (match) => String(printableScoreLabel(match) || '').replace(/\s*•\s*/g, ' ').replace(/-/g, '/');
    const scheduleLabel = (iso) => {
      if (!iso) return '';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };
    const rankingLabel = side => {
      if (!side?.id) return '';
      const participant = getParticipant(category, side.id);
      if (!participant || participant.rankingLabel === 'Sem ranking') return '';
      return String(participant.rankingLabel).padStart(4, '0');
    };

    // Coordenadas proporcionais ao A4 retrato: a área vertical da folha é usada
    // integralmente, sem aumentar a fonte ou comprimir as partidas entre si.
    const manyRounds = roundCount > 4;
    const viewWidth = manyRounds ? 1040 : 900;
    const leftSeedX = 8;
    const leftRankX = 39;
    const leftNameX = 75;
    const firstJoinX = manyRounds ? 312 : 308;
    const firstLineStartX = leftNameX - 10;
    const nextColumnWidth = manyRounds ? 123 : 131;
    const columnGap = manyRounds ? 11 : 14;
    const roundBaseX = [];
    for (let i = 1; i < roundCount; i++) roundBaseX.push(firstJoinX + 12 + (i - 1) * (nextColumnWidth + columnGap));
    const championX = roundCount > 1 ? roundBaseX[roundCount - 2] + nextColumnWidth + 18 : firstJoinX + 22;

    const stageTop = 76;
    const pairSep = firstRoundMatches >= 16 ? 32 : 41;
    const matchStep = Math.min(250, Math.max(54, Math.floor(960 / Math.max(1, firstRoundMatches - 1))));
    const stageBottom = stageTop + (firstRoundMatches - 1) * matchStep + pairSep;
    const viewHeight = Math.max(firstRoundMatches >= 4 ? 1120 : 800, stageBottom + 40);

    const nodes = [];
    rounds.forEach((round, roundIndex) => {
      const roundNodes = round.matches.map((match, matchIndex) => {
        if (roundIndex === 0) {
          const yA = stageTop + matchIndex * matchStep;
          const yB = yA + pairSep;
          return {roundIndex, matchIndex, match, left:firstJoinX, right:firstJoinX,
            top:yA, bottom:yB, center:(yA+yB)/2, yA, yB};
        }
        const previous = nodes[roundIndex - 1];
        const prevA = previous[matchIndex * 2] || null;
        const prevB = previous[matchIndex * 2 + 1] || null;
        const top = prevA?.center ?? stageTop;
        const bottom = prevB?.center ?? (top + pairSep);
        const left = roundBaseX[roundIndex - 1];
        return {roundIndex, matchIndex, match, left, right:left + nextColumnWidth,
          top, bottom, center:(top+bottom)/2, prevA, prevB};
      });
      nodes.push(roundNodes);
    });

    const lastMatch = rounds.at(-1)?.matches?.[0] || null;
    const finalOutcome = lastMatch ? knockoutMatchOutcome(lastMatch, category.formatPreset) : null;
    const championNames = finalOutcome?.winner ? teamLineNames(finalOutcome.winner.name,{initial:true,maxChars:16}) : [];

    const svg = [];
    const stroke = (x1,y1,x2,y2, type='pelim-line') => svg.push(`<line class="${type}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
    const label = (x,y,value,css='pelim-text',opts={}) => {
      if (!value) return;
      const maxWidth = opts.width || 0;
      const font = opts.font || (css === 'pelim-first-name' ? 12.2 : 11.4);
      const estimated = String(value).length * font * .59;
      const fit = maxWidth && estimated > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : '';
      const clip = opts.clip ? ` clip-path="url(#${opts.clip})"` : '';
      const anchor = opts.anchor ? ` text-anchor="${opts.anchor}"` : '';
      svg.push(`<text class="${css}" x="${x}" y="${y}"${anchor}${fit}${clip}>${escapeHtml(String(value))}</text>`);
    };
    const names = (list,x,y,css,width,clip,step=13) => {
      (list||[]).slice(0,2).forEach((entry,i) => label(x,y+i*step,entry,css,{width,clip,font:css === 'pelim-first-name' ? 12.2 : 11.4}));
    };

    // Primeiro estágio: linhas abaixo dos dois nomes, com três colunas protegidas.
    (nodes[0] || []).forEach((node, idx) => {
      const first = node.match.sideA;
      const second = node.match.sideB;
      const firstRoundOutcome = knockoutMatchOutcome(node.match, category.formatPreset);
      const lineA = teamLineNames(first?.name || (firstRoundOutcome.status === 'bye' ? 'BYE' : 'A DEFINIR'), {maxChars:31});
      const lineB = teamLineNames(second?.name || (firstRoundOutcome.status === 'bye' ? 'BYE' : 'A DEFINIR'), {maxChars:31});
      const slotTop = node.yA, slotBottom = node.yB;
      label(leftSeedX, slotTop - 9, `${idx+1}.1`, 'pelim-seed');
      label(leftSeedX, slotBottom - 9, `${idx+1}.2`, 'pelim-seed');
      label(leftRankX, slotTop - 9, rankingLabel(first), 'pelim-seed');
      label(leftRankX, slotBottom - 9, rankingLabel(second), 'pelim-seed');
      label(leftNameX,slotTop - 44,`JOGO ${idx+1}  ${shortRound(rounds[0]?.name,0)}`,'pelim-small');
      names(lineA,leftNameX,slotTop - (lineA.length > 1 ? 25 : 10),'pelim-first-name',firstJoinX-leftNameX-8,'clip-first',14);
      names(lineB,leftNameX,slotBottom - (lineB.length > 1 ? 25 : 10),'pelim-first-name',firstJoinX-leftNameX-8,'clip-first',14);
      stroke(firstLineStartX,slotTop,firstJoinX,slotTop);
      stroke(firstLineStartX,slotBottom,firstJoinX,slotBottom);
      stroke(firstJoinX,slotTop,firstJoinX,slotBottom);
      const schedule = scheduleLabel(effectiveSchedule(category,null,node.match));
      if (schedule) label(firstJoinX+5,node.center - 2,schedule,'pelim-date',{width:100});
      if (specialResultInfo(node.match)) label(firstJoinX+5,node.center+13,scoreLabel(node.match),'pelim-score',{width:100});
    });

    // Etapas seguintes: ligações ortogonais sem arestas duplicadas.
    for (let index=1;index<nodes.length;index++) {
      nodes[index].forEach((node,idx) => {
        const match = node.match;
        const outcome = knockoutMatchOutcome(match,category.formatPreset);
        const clip=`clip-round-${index}`;
        const winnerNames = outcome?.winner
          ? teamLineNames(outcome.winner.name,{initial:true,maxChars:17})
          : ['A DEFINIR'];
        const score = scoreLabel(match);
        stroke(node.prevA?.right ?? node.left,node.top,node.right,node.top);
        stroke(node.prevB?.right ?? node.left,node.bottom,node.right,node.bottom);
        stroke(node.right,node.top,node.right,node.bottom);
        label(node.left+5,node.top-13,`JOGO ${idx+1} ${shortRound(rounds[index]?.name,index)}`,'pelim-small');
        names(winnerNames,node.left+5,node.top+16,'pelim-next-name',nextColumnWidth-11,clip,13);
        if (score) label(node.left+5,node.top+52,score,'pelim-score',{width:nextColumnWidth-12,clip});
        const schedule=scheduleLabel(effectiveSchedule(category,null,match));
        if (schedule) label(node.left+5,node.top+68,schedule,'pelim-date',{width:nextColumnWidth-12,clip});
      });
    }
    if (nodes.length && championNames.length) {
      const finalNode=nodes.at(-1)[0];
      stroke(finalNode.right,finalNode.center,championX-5,finalNode.center);
      names(championNames,championX,finalNode.center-16,'pelim-next-name',viewWidth-championX-7,'clip-champion',13);
      if (lastMatch) label(championX,finalNode.center+20,scoreLabel(lastMatch),'pelim-score',{width:viewWidth-championX-7,clip:'clip-champion'});
    }

    const headings = [shortRound(rounds[0]?.name,0),...rounds.slice(1).map((round,index)=>shortRound(round.name,index+1)),'CAMPEÃO'];
    const positions=[leftNameX,...roundBaseX,championX];
    const columnHead = headings.map((heading,index)=> {
      const total=index<roundCount ? `${rounds[index]?.matches?.length || 0} jogos` : '';
      const x=positions[index] || leftNameX;
      return `<text x="${x}" y="15" class="pelim-header-label">${escapeHtml(heading)}</text>${total ? `<text x="${x}" y="30" class="pelim-header-sub">${escapeHtml(total)}</text>` : ''}`;
    }).join('');

    return `
      <style>
        .print-root .pelim-ref-sheet{padding:3mm 3mm 2mm;background:#fff;color:#111;page-break-inside:avoid;break-inside:avoid;}
        .print-root .pelim-ref-top{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-bottom:2.5mm;}
        .print-root .pelim-ref-logo{width:13mm;height:13mm;object-fit:contain;}
        .print-root .pelim-ref-title{font-size:12px;font-weight:800;line-height:1.12;margin:0 0 2px;}
        .print-root .pelim-ref-sub{font-size:8.5px;line-height:1.25;margin:0;color:#222;}
        .print-root .pelim-ref-meta{font-size:8px;line-height:1.2;text-align:right;white-space:nowrap;}
        .print-root .pelim-ref-header{width:100%;height:auto;display:block;background:#f5f6f7;border-top:1px solid #b8bcc4;border-bottom:1px solid #b8bcc4;margin-bottom:2mm;}
        .print-root .pelim-ref-header text{font-family:Arial,Helvetica,sans-serif;fill:#171b23;}
        .print-root .pelim-header-label{font-size:12px;font-weight:800;}
        .print-root .pelim-header-sub{font-size:10px;font-weight:500;fill:#454b54;}
        .print-root .pelim-ref-svg-wrap{width:100%;overflow:hidden;}
        .print-root .pelim-ref-svg{width:100%;height:auto;display:block;background:#fff;font-family:Arial,Helvetica,sans-serif;}
        .print-root .pelim-line{stroke:#969da6;stroke-width:1.15;fill:none;vector-effect:non-scaling-stroke;}
        .print-root .pelim-small{font-size:9.6px;font-weight:700;fill:#536071;letter-spacing:.1px;}
        .print-root .pelim-seed{font-size:9.6px;font-weight:600;fill:#677181;}
        .print-root .pelim-first-name{font-size:12.2px;font-weight:700;fill:#111827;}
        .print-root .pelim-next-name{font-size:11.4px;font-weight:800;fill:#111827;}
        .print-root .pelim-score{font-size:10.7px;font-weight:800;fill:#1f2937;}
        .print-root .pelim-date{font-size:9.7px;font-weight:700;fill:#b91c1c;}
        @media print {
          .print-root .pelim-ref-sheet{width:100%!important;padding:2mm 2.5mm 1mm!important;margin:0!important;}
          .print-root .pelim-ref-top{margin-bottom:2mm;}
          .print-root .pelim-ref-header{margin-bottom:1mm;}
        }
      </style>
      <section class="sheet pelim-ref-sheet">
        <div class="pelim-ref-top">
          <img class="pelim-ref-logo" src="${getTournamentPrintLogo()}" alt="${escapeHtml(getTournamentPrintLogoAlt())}">
          <div>
            <h1 class="pelim-ref-title">${escapeHtml(tournamentName)}</h1>
            <p class="pelim-ref-sub"><strong>Categoria:</strong> ${escapeHtml(category.name)}<br><strong>Formato:</strong> Grupo + Chaves</p>
          </div>
          <div class="pelim-ref-meta"><strong>${registeredDoubles === null ? `Chave: ${participantCount} posições` : `${registeredDoubles} duplas · ${participantCount} posições`}</strong><br><strong>Impresso:</strong> ${escapeHtml(printedAt)}</div>
        </div>
        <svg class="pelim-ref-header" viewBox="0 0 ${viewWidth} 38" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rodadas da eliminatória">
          <text x="${leftSeedX}" y="22" class="pelim-header-label">#</text>
          <text x="${leftRankX}" y="22" class="pelim-header-label">RK</text>
          ${columnHead}
        </svg>
        <div class="pelim-ref-svg-wrap">
          <svg class="pelim-ref-svg" viewBox="0 0 ${viewWidth} ${viewHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chave eliminatória para impressão">
            <defs>
              <clipPath id="clip-first"><rect x="${leftNameX-2}" y="0" width="${firstJoinX-leftNameX-6}" height="${viewHeight}"/></clipPath>
              ${roundBaseX.map((x,i)=>`<clipPath id="clip-round-${i+1}"><rect x="${x+2}" y="0" width="${nextColumnWidth-7}" height="${viewHeight}"/></clipPath>`).join('')}
              <clipPath id="clip-champion"><rect x="${championX-2}" y="0" width="${viewWidth-championX-5}" height="${viewHeight}"/></clipPath>
            </defs>
            ${svg.join('')}
          </svg>
        </div>
      </section>`;
  }

