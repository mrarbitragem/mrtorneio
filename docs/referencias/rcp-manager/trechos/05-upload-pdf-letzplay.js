/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 8980-9404.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 8980-9404 ----
  // Importador PDF local. Lê textos e tabelas de PDFs Letzplay com texto selecionável,
  // sem enviar o arquivo a nenhum servidor e sem depender de bibliotecas externas.
  let pendingPdfCategory = null;

  function decodePdfUnicodeHex(hex) {
    const nums = (hex.match(/.{4}/g) || []).map(v => parseInt(v, 16));
    if (!nums.length) return '';
    return String.fromCharCode(...nums);
  }

  async function extractPdfPositionedText(file) {
    if (file.size > 20 * 1024 * 1024) throw new Error('PDF muito grande (limite: 20 MB).');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder('latin1').decode(bytes.slice(0,8)).indexOf('%PDF-') !== 0) throw new Error('Arquivo não é um PDF válido.');
    const body = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    const objects = new Map();
    for (const m of body.matchAll(/(?:^|\n)(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj/g)) objects.set(Number(m[1]), m[2]);
    if (!objects.size) throw new Error('Não foi possível ler a estrutura deste PDF.');
    const streamCache = new Map();
    async function streamAt(id) {
      if (streamCache.has(id)) return streamCache.get(id);
      const obj = objects.get(id) || '';
      // O comprimento declarado (/Length) é a fonte correta para o fluxo binário.
      // Alguns PDFs (Skia/Chrome) terminam o fluxo comprimido com CR (0x0D).
      // A regex antiga consumia este byte como parte do separador antes de
      // endstream, tornando o fluxo zlib truncado mesmo em PDFs íntegros.
      const start = /\bstream(?:\r\n|\n|\r)/.exec(obj);
      if (!start) return '';
      const begin = start.index + start[0].length;
      const header = obj.slice(0, start.index);
      const declared = /\/Length\s+(\d+)\b/.exec(header);
      const declaredLength = declared ? Number(declared[1]) : null;
      let binary;
      if (declaredLength !== null && Number.isSafeInteger(declaredLength) && declaredLength >= 0 && begin + declaredLength <= obj.length) {
        binary = obj.slice(begin, begin + declaredLength);
      } else {
        // Fallback para estruturas sem /Length numérico direto.
        const end = obj.lastIndexOf('endstream');
        if (end < begin) throw new Error('Fluxo PDF malformado (objeto ' + id + ').');
        let finish = end;
        if (obj[finish - 1] === '\n') finish--;
        if (obj[finish - 1] === '\r') finish--;
        binary = obj.slice(begin, finish);
      }
      let raw = Uint8Array.from(binary, c => c.charCodeAt(0));
      if (/\/FlateDecode\b/.test(obj)) {
        if (!('DecompressionStream' in window)) throw new Error('Este navegador não oferece leitura PDF local. Atualize o navegador.');
        try { raw = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); }
        catch (error) { throw new Error('Não foi possível descompactar o bloco ' + id + ' do PDF.'); }
      } else if (/\/Filter\s*\//.test(obj)) throw new Error('O PDF utiliza compactação não compatível com o importador local.');
      const result = new TextDecoder('latin1').decode(raw);
      streamCache.set(id, result);
      return result;
    }
    const fontMaps = new Map();
    for (const [id, value] of objects) {
      if (!/\/Type\s*\/Font\b/.test(value) && !/\/Subtype\s*\/Type0\b/.test(value)) continue;
      const unicodeId = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(value)?.[1];
      const map = new Map();
      if (unicodeId) {
        const cmap = await streamAt(Number(unicodeId));
        const singles = cmap.match(/beginbfchar([\s\S]*?)endbfchar/)?.[1] || '';
        const ranges = cmap.match(/beginbfrange([\s\S]*?)endbfrange/)?.[1] || '';
        for (const m of singles.matchAll(/<([\dA-Fa-f]+)>\s*<([\dA-Fa-f]+)>/g)) {
          map.set(m[1].toUpperCase(), decodePdfUnicodeHex(m[2]));
        }
        for (const m of ranges.matchAll(/<([\dA-Fa-f]+)>\s*<([\dA-Fa-f]+)>\s*<([\dA-Fa-f]+)>/g)) {
          const start = parseInt(m[1], 16), end = parseInt(m[2], 16), target = parseInt(m[3], 16);
          if (end - start > 512 || end < start) continue;
          for (let code = start; code <= end; code++) {
            const key = code.toString(16).toUpperCase().padStart(m[1].length, '0');
            const dst = (target + code - start).toString(16).padStart(m[3].length, '0');
            map.set(key, decodePdfUnicodeHex(dst));
          }
        }
      }
      fontMaps.set(id, { map, twoBytes: /\/Identity-H/.test(value) });
    }
    const result = [];
    for (const [id, page] of objects) {
      if (!/\/Type\s*\/Page\b/.test(page)) continue;
      const contentRefs = [];
      const single = /\/Contents\s+(\d+)\s+\d+\s+R/.exec(page);
      if (single) contentRefs.push(Number(single[1]));
      else {
        const array = /\/Contents\s*\[([^\]]+)\]/.exec(page)?.[1] || '';
        for (const m of array.matchAll(/(\d+)\s+\d+\s+R/g)) contentRefs.push(Number(m[1]));
      }
      const fonts = new Map();
      const fontDict = /\/Font\s*<<([\s\S]*?)>>/.exec(page)?.[1] || '';
      for (const m of fontDict.matchAll(/\/(F\w+)\s+(\d+)\s+\d+\s+R/g)) fonts.set(m[1], fontMaps.get(Number(m[2])));
      const runs = [];
      for (const ref of contentRefs) {
        const stream = await streamAt(ref);
        for (const bt of stream.matchAll(/\bBT\b([\s\S]*?)\bET\b/g)) {
          const textOps = bt[1];
          const font = /\/(F\w+)\s+[\d.]+\s+Tf/.exec(textOps)?.[1];
          const tm = /[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+Tm/.exec(textOps);
          if (!tm) continue;
          const fontInfo = fonts.get(font) || { map: new Map(), twoBytes: true };
          let text = '';
          for (const item of textOps.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) {
            const glyphHex = item[1].toUpperCase();
            const stride = fontInfo.twoBytes ? 4 : 2;
            for (let i = 0; i < glyphHex.length; i += stride) {
              const glyph = glyphHex.slice(i, i + stride);
              text += fontInfo.map.get(glyph) || ((parseInt(glyph, 16) < 128 && !fontInfo.twoBytes) ? String.fromCharCode(parseInt(glyph, 16)) : '');
            }
          }
          if (text.trim()) runs.push({x:Number(tm[1]), y:Number(tm[2]), text:text.replace(/\s+/g,' ').trim()});
        }
      }
      if (runs.length) {
        const titleRun = runs.find(run => run.x > 60 && /Circuito|Letzplay/i.test(run.text));
        const pageOffset = titleRun ? titleRun.y - 23 : 0;
        runs.forEach(run => {run.y -= pageOffset;});
        result.push({ id, runs });
      }
    }
    if (!result.length) throw new Error('Nenhum texto legível encontrado. PDFs escaneados ou protegidos precisam ser convertidos para PDF com texto pesquisável.');
    return result;
  }

  function pdfNormalizeName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function pdfNameSimilarity(a,b) {
    const left = pdfNormalizeName(a).split(' ').filter(Boolean);
    const right = pdfNormalizeName(b).split(' ').filter(Boolean);
    if (!left.length || !right.length) return 0;
    const common = left.filter(t => right.includes(t)).length;
    return (common / Math.max(left.length,right.length)) * .65 +
      (left[0] === right[0] ? .2 : 0) +
      (left[left.length-1] === right[right.length-1] ? .15 : 0);
  }
  function resolvePdfDuo(label, roster) {
    const parts = String(label || '').split('/').map(s=>s.trim());
    if (parts.length !== 2) return null;
    const scores = roster.map((team, idx) => {
      const athletes = team.name.split(' / ');
      const forward = (pdfNameSimilarity(parts[0],athletes[0]) + pdfNameSimilarity(parts[1],athletes[1])) / 2;
      const reverse = (pdfNameSimilarity(parts[0],athletes[1]) + pdfNameSimilarity(parts[1],athletes[0])) / 2;
      return { idx, score: Math.max(forward, reverse) };
    }).sort((a,b)=>b.score-a.score);
    if (!scores[0] || scores[0].score < .53 || (scores[1] && scores[0].score - scores[1].score < .11)) return null;
    return roster[scores[0].idx];
  }
  function pdfLocalDate(label, periodDate) {
    const months = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
    const m = /(\d{1,2})\s*\/\s*([a-zç]{3})\s+(?:(?:as|às)\s*)?(\d{1,2}):(\d{2})/i.exec(label.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
    if (!m || !months[m[2].toLowerCase()]) return '';
    const y = /\d{2}\/\d{2}\/(\d{2,4})/.exec(periodDate || '')?.[1];
    if (!y) return '';
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const v = [year, Number(m[2] && months[m[2].toLowerCase()]), Number(m[1]), Number(m[3]), Number(m[4])];
    if (v[2] < 1 || v[2] > 31 || v[3] > 23 || v[4] > 59) return '';
    return `${v[0]}-${String(v[1]).padStart(2,'0')}-${String(v[2]).padStart(2,'0')}T${String(v[3]).padStart(2,'0')}:${String(v[4]).padStart(2,'0')}`;
  }
  // Interpretação de inscritos por linha de DUPLA e não por posição fixa.
  // No Letzplay feminino/masculino, os atletas podem ocupar linhas distintas;
  // em categorias mistas podem aparecer no mesmo campo separados por "/"
  // ou no mesmo alinhamento horizontal em colunas diferentes.
  function parsePdfRosterGroup(ordered, label, warnings) {
    const playerHeader = ordered.find(r => /^JOGADORES(?:\s|$)/i.test(r.text) && !/JOGADORES\s*0?[12]/i.test(r.text));
    const gamesHeader = ordered.find(r => /^JOGOS$/i.test(r.text) && (!playerHeader || r.y > playerHeader.y+25));
    if (!playerHeader || !gamesHeader) {
      warnings.push(`${label}: tabela de inscritos não encontrada.`);
      return [];
    }
    const top = playerHeader.y + 8;
    const bottom = gamesHeader.y - 8;
    const playerX = playerHeader.x;
    // A área de atletas termina antes da coluna "JOGOS" do quadro de classificação.
    const gamesCol = ordered.find(r => /^JOGOS$/i.test(r.text) && Math.abs(r.y - playerHeader.y) < 12 && r.x > playerX+50);
    const left = Math.max(48, playerX - 35);
    const right = gamesCol ? gamesCol.x - 12 : playerX + 275;
    const candidate = ordered.filter(r => r.y >= top && r.y < bottom && r.x >= left && r.x < right && /[A-Za-zÀ-ÿ]/.test(r.text) && !/^(?:SIT\.?|RANK\.?|JOGADORES|CLASSIF\.?|VITORIAS|DERROTAS|SETS|GAMES)$/i.test(r.text));
    const numberLines = ordered.filter(r => r.y >= top && r.y < bottom && r.x < Math.max(60,playerX - 45) && /^\d{1,3}$/.test(r.text))
      .sort((a,b) => a.y-b.y);
    const rows = [];
    if (numberLines.length) {
      for (let i=0; i<numberLines.length; i++) {
        const previous = numberLines[i-1]?.y ?? (numberLines[i].y - (numberLines[i+1]?.y-numberLines[i].y || 48));
        const next = numberLines[i+1]?.y ?? (numberLines[i].y + (numberLines[i].y-previous));
        const low = (previous + numberLines[i].y)/2;
        const high = (numberLines[i].y + next)/2;
        rows.push(candidate.filter(r => r.y >= low && r.y < high));
      }
    } else {
      // Alguns modelos exportados não trazem o número da dupla: aproveita a
      // separação vertical das linhas para reconstruir as inscrições.
      const lines = candidate.slice().sort((a,b)=>a.y-b.y || a.x-b.x);
      const clusters = [];
      for (const run of lines) {
        let group = clusters[clusters.length-1];
        if (!group || run.y - group.at > 22) clusters.push(group = {at:run.y,items:[]});
        group.items.push(run);
      }
      for (const group of clusters) rows.push(group.items);
    }
    const parseRow = items => {
      const lines = items.slice().sort((a,b)=>a.y-b.y || a.x-b.x);
      const combined = lines.map(r=>String(r.text).trim()).filter(Boolean);
      if (!combined.length) return null;
      // A mesma dupla pode ser impressa numa linha: "HOMEM / MULHER".
      if (combined.length===1 && /\s*[/|]\s*/.test(combined[0])) {
        const duo = combined[0].split(/\s*[/|]\s*/).map(s=>s.trim()).filter(Boolean);
        if (duo.length===2) return duo;
      }
      // Caso os dois atletas sejam duas colunas na MESMA linha.
      if (combined.length===2 && lines.length===2 && Math.abs(lines[0].y-lines[1].y)<4) {
        const duo = combined.map(s=>s.trim());
        return duo.every(Boolean) ? duo : null;
      }
      // Dois nomes em linhas diferentes, como nos PDFs já suportados.
      if (combined.length===2 && !combined.some(s=>/\s*[/|]\s*/.test(s))) return combined;
      // Textos segmentados em mais de um run: juntar a linha, preservando a
      // posição em que os dois atletas foram separados pelo exportador.
      const separated = [];
      for (const run of lines) {
        const parts = run.text.split(/\s*[/|]\s*/).filter(Boolean);
        if (parts.length===2) separated.push(...parts);
        else separated.push(run.text.trim());
      }
      if (separated.length===2) return separated;
      return null;
    };
    const teams = [];
    for (const row of rows) {
      const duo = parseRow(row);
      if (!duo || duo.some(name=>name.length<2)) {
        if (row.length) warnings.push(`${label}: uma inscrição contém nomes de atletas em formato não reconhecido.`);
        continue;
      }
      // Ranking pode ter um código por atleta, mas não é obrigatório.
      const codes = ordered.filter(r => r.x >= 40 && r.x < playerX && /^\d{1,6}$/.test(r.text) &&
        r.y >= Math.min(...row.map(n=>n.y))-6 && r.y <= Math.max(...row.map(n=>n.y))+6).sort((a,b)=>a.y-b.y).map(r=>r.text);
      teams.push({names:duo,rankingLabel:codes.slice(0,2).join(' / ') || 'Sem ranking'});
    }
    if (!teams.length) warnings.push(`${label}: nenhuma dupla identificada. Confira se os dois atletas aparecem juntos na linha ou em linhas separadas.`);
    return teams;
  }
  function parseLetzplayCategory(pages, fileName) {
    const warnings = [];
    const first = pages[0]?.runs || [];
    const heading = first.filter(r => r.y < 58 && /(?:Dupla|Feminina|Masculina|Mista|Master)/i.test(r.text))
      .sort((a,b) => a.y-b.y || a.x-b.x)[0]?.text || '';
    const categoryMatch = heading.match(/(?:Dupla\s+)?(?:Feminina|Masculina|Mista|Master)(?:\s+(?:Iniciante|Open|Pro|A|B|C|D|E))?/i);
    const short = first.find(r => r.y >= 30 && r.y <= 52 && r.x > 55 && r.x < 200 && /^[A-E]$/i.test(r.text))?.text || '';
    const categoryLabel = (categoryMatch?.[0] || heading.split(' - ').at(-1) || '').trim();
    const suggestedName = `${categoryLabel}${short && !categoryLabel.toUpperCase().endsWith(' '+short.toUpperCase()) ? ` ${short}` : ''}`.trim() || fileName.replace(/\.pdf$/i,'');
    const periodDate = first.map(r=>r.text).join(' ').match(/\d{2}\/\d{2}\/\d{2,4}\s*-\s*\d{2}\/\d{2}\/\d{2,4}/)?.[0] || '';
    const groupPages = pages.map(page => {
      const grp = page.runs.find(r => /^GRUPO\s+\d+/i.test(r.text));
      return grp ? {page, label:grp.text.match(/^GRUPO\s+\d+/i)[0]} : null;
    }).filter(Boolean);
    if (!groupPages.length) throw new Error('Este PDF não contém grupos reconhecíveis no modelo Letzplay.');
    const groups = [];
    const roster = [];
    const pdfMatches = [];
    for (const {page, label} of groupPages) {
      const ordered = page.runs;
      const parsedTeams = parsePdfRosterGroup(ordered, label, warnings);
      const entries = [];
      for (const duo of parsedTeams) {
        const team = {id:uid('team'), name:duo.names.join(' / '), ranking:999999, rankingLabel:duo.rankingLabel,drawOrder:roster.length+1};
        roster.push(team);
        entries.push(team);
      }
      if (!entries.length) continue;
      const group = {id:uid('group'),name:label.replace(/^GRUPO/i,'Grupo'),size:entries.length,participants:entries.map(p=>p.id),matches:[],defaultMatchTime:'',collapsed:false,tieBreakDraws:{}};
      // O mesmo modelo Letzplay pode apresentar 3 situações:
      // PDF sem resultados, PDF com placar e PDF com W.O./linha Venc:.
      // As coordenadas derivadas dos cabeçalhos impedem que a coluna PLACAR
      // se misture com JOGADORES 01, e os limites verticais incluem as duas
      // linhas de cada dupla mesmo quando o número do jogo fica entre elas.
      const gameHeading = ordered.find(r => /^JOGADORES\s*0?1$/i.test(r.text) && r.y > 320);
      const scoreHeading = ordered.find(r => /^PLACAR$/i.test(r.text) && r.y > 320);
      const rivalHeading = ordered.find(r => /^JOGADORES\s*0?2$/i.test(r.text) && r.y > 320);
      const dateHeading = ordered.find(r => /^DATA\/HORA$/i.test(r.text) && r.y > 320);
      const colAStart = (gameHeading?.x ?? 226) - 10;
      const colAEnd = (scoreHeading?.x ?? 466) - 72;
      const colBStart = ((scoreHeading?.x ?? 466) + (rivalHeading?.x ?? 658)) / 2 + 9;
      const colBEnd = Math.max((rivalHeading?.x ?? 658) + 110, 780);
      const nums = ordered.filter(r => r.x >= 7 && r.x < 31 && r.y > (gameHeading?.y ?? 395) + 15 && /^\d{1,4}$/.test(r.text)).sort((a,b) => a.y-b.y);
      for (let index=0; index<nums.length; index++) {
        const number = nums[index];
        const current = number.y;
        const last = nums[index-1]?.y ?? current - ((nums[index+1]?.y ?? current+48) - current);
        const next = nums[index+1]?.y ?? current + (current-last);
        const low = (last + current)/2, high = (current + next)/2;
        const cell = (xMin,xMax) => ordered
          .filter(r => r.x >= xMin && r.x < xMax && r.y >= low && r.y < high && r.text)
          .sort((a,b) => a.y-b.y || a.x-b.x).map(r => r.text).join(' ').trim();
        const left = cell(colAStart,colAEnd);
        const right = cell(colBStart,colBEnd);
        const meta = cell((dateHeading?.x ?? 34)-5,colAStart-6);
        if (!left || !right) {warnings.push(`${label}, jogo ${number.text}: nomes não identificados.`); continue;}
        const a=resolvePdfDuo(left,entries), b=resolvePdfDuo(right,entries);
        if (!a || !b || a.id===b.id) {warnings.push(`${label}, jogo ${number.text}: dupla não reconhecida (${left} × ${right}).`); continue;}
        const match = {id:uid('match'),teamA:a.id,teamB:b.id,sourceMatchNumber:number.text,scheduledAt:pdfLocalDate(meta,periodDate),court:meta.match(/QUADRA\s*\d+/i)?.[0]?.toUpperCase() || '',sets:blankSets('1x6')};
        group.matches.push(match);
        pdfMatches.push(match);
        if (!match.scheduledAt && /\d\d:\d\d/.test(meta)) warnings.push(`${label}, jogo ${number.text}: data/hora não reconhecida.`);
      }
      const expected = entries.length*(entries.length-1)/2;
      if (group.matches.length!==expected) warnings.push(`${label}: ${group.matches.length} jogo(s) reconhecido(s) de ${expected} esperados.`);
      groups.push(group);
    }
    const scheduleCounts = new Map();
    pdfMatches.forEach(match=>{
      if (!match.scheduledAt || !match.court) return;
      const key = `${match.scheduledAt} | ${match.court}`;
      scheduleCounts.set(key,(scheduleCounts.get(key)||0)+1);
    });
    for (const [slot,count] of scheduleCounts) {
      if (count>1) warnings.push(`Conflito de agenda no PDF: ${count} jogos em ${slot.replace('T',' às ')}. Os horários serão preservados; revise-os após importar.`);
    }
    const good = roster.length>=3 && groups.length && groups.every(g=>g.participants.length>=2&&g.matches.length===g.size*(g.size-1)/2);
    return {fileName,suggestedName,periodDate,groups,roster,matches:pdfMatches,warnings,canImport:!!good};
  }

  function renderPdfCategoryPreview() {
    const preview = el.pdfImportPreview;
    const data = pendingPdfCategory;
    if (!preview) return;
    if (!data) {preview.classList.add('hidden');preview.innerHTML='';return;}
    const games = data.matches.length;
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="pdf-import-header"><strong>Conferir categoria extraída</strong><span class="badge">${escapeHtml(data.fileName)}</span></div>
      <label for="pdfImportedCategoryName">Nome da categoria no RCP</label>
      <input id="pdfImportedCategoryName" value="${escapeHtml(data.suggestedName)}" maxlength="110">
      <div class="pdf-import-stats"><span><strong>${data.groups.length}</strong> grupos</span><span><strong>${data.roster.length}</strong> duplas</span><span><strong>${games}</strong> jogos</span></div>
      <p class="small muted" style="margin:6px 0 10px">Importação de estrutura: nomes, grupos, confrontos, datas e quadras. <strong>Placares, W.O. e chave eliminatória do PDF ainda não são transferidos.</strong> Registre os resultados no RCP após importar.</p>
      ${/\bmista\b/i.test(data.suggestedName) ? '<p class="small muted" style="margin:0 0 10px">Duplas mistas: cada inscrição representa um homem e uma mulher. Confira os dois atletas de cada dupla na lista abaixo.</p>' : ''}
      ${data.groups.map(group => `<details class="pdf-import-group" open><summary><strong>${escapeHtml(group.name)}</strong> — ${group.size} duplas, ${group.matches.length} jogos</summary><div class="small">${group.participants.map(id=>`<div>• ${escapeHtml(data.roster.find(p=>p.id===id)?.name || '')}</div>`).join('')}</div></details>`).join('')}
      ${data.warnings.length ? `<div class="pdf-import-warnings"><strong>Atenção (${data.warnings.length} aviso(s)):</strong><div>${data.warnings.slice(0,10).map(w=>`<div>• ${escapeHtml(w)}</div>`).join('')}</div>${data.warnings.length>10?`<div>… mais ${data.warnings.length-10} aviso(s). Ajuste o PDF antes da importação.</div>`:''}</div>` : `<div class="small ok">Grupos e confrontos identificados. A estrutura da eliminatória será gerada no RCP após a classificação.</div>`}
      <div class="inline-actions"><button class="primary" id="pdfConfirmImportBtn" type="button" ${data.canImport?'':'disabled'}>Confirmar e criar categoria</button><button class="ghost" id="pdfCancelImportBtn" type="button">Cancelar</button></div>
      ${!data.canImport ? '<p class="small error">Importação bloqueada para evitar categoria vazia ou jogos incorretos. Confira a lista de atletas e os confrontos no PDF de origem.</p>' : ''}`;
    preview.querySelector('#pdfCancelImportBtn').addEventListener('click',()=>{pendingPdfCategory=null;el.pdfCategoryInput.value='';renderPdfCategoryPreview();});
    preview.querySelector('#pdfConfirmImportBtn').addEventListener('click',confirmPdfCategoryImport);
  }

  function confirmPdfCategoryImport() {
    const data = pendingPdfCategory;
    if (!data?.canImport) return;
    const name = (document.getElementById('pdfImportedCategoryName')?.value||'').trim();
    if (!name) {setStatus('Informe um nome para a categoria importada.','warn');return;}
    if (state.categories.some(c=>c.name.trim().toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))) {
      setStatus('Já existe uma categoria com esse nome. Altere o nome para não sobrescrever os dados atuais.', 'error');return;
    }
    const category=emptyCategory(name);
    category.participants=data.roster;
    category.groups=data.groups;
    category.groupBuildMode='manual';
    category.manualAssignments=assignmentsFromGroups(category.groups);
    category.pdfSource = {name:data.fileName, importedAt:new Date().toISOString(),source:'Letzplay',groupCount:data.groups.length,matchCount:data.matches.length};
    // PDFs sem placar apenas definem jogos e horários, nunca resultados ou classificados.
    category.groupStageConfirmed=false;
    category.elimination=null;
    state.categories.push(category);
    state.activeCategoryId=category.id;
    state.meta.mainSection='activeCategorySection';
    state.meta.activeCategoryPanel='groups';
    touchMeta();
    try {saveToStorage();}
    catch(err) {state.categories.pop();state.activeCategoryId=state.categories[0]?.id||null;setStatus('Espaço insuficiente para salvar esta categoria no navegador. Exporte um JSON e libere armazenamento.','error');return;}
    pendingPdfCategory=null;
    el.pdfCategoryInput.value='';
    renderPdfCategoryPreview();
    renderAll();
    setStatus(`Categoria <strong>${escapeHtml(name)}</strong> importada do PDF com ${data.roster.length} duplas em ${data.groups.length} grupos e ${data.matches.length} jogos.`, 'ok');
    requestScrollTo('#activeCategorySection');
    setTimeout(flushPendingScroll,30);
  }

  async function handlePdfCategoryFile(file) {
    if (!file) return;
    pendingPdfCategory=null;
    renderPdfCategoryPreview();
    el.pdfImportStatus.textContent = `Lendo ${file.name}...`;
    el.pdfCategoryInput.disabled=true;
    try {
      const pages=await extractPdfPositionedText(file);
      const result=parseLetzplayCategory(pages,file.name);
      pendingPdfCategory=result;
      renderPdfCategoryPreview();
      el.pdfImportStatus.textContent = `Leitura concluída: ${result.groups.length} grupos e ${result.matches.length} jogos. Confira antes de importar.`;
    } catch(err) {
      console.error('RCP: importação PDF',err);
      el.pdfImportStatus.textContent = `Não foi possível importar: ${err.message}`;
      setStatus(escapeHtml(err.message),'error');
    } finally {el.pdfCategoryInput.disabled=false;}
  }
  // Sem filtro nativo de extensão: evita PDFs invisíveis no seletor do Windows.
  // O leitor confere a assinatura %PDF- nos bytes do arquivo antes de importar.
  el.pdfCategoryInput?.removeAttribute('accept');
  el.pdfCategoryInput?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    event.target.value=''; // permite escolher novamente o mesmo PDF após um erro
    if(file) handlePdfCategoryFile(file);
  });
  const pdfDropzone=document.getElementById('pdfCategoryDropzone');
  if(pdfDropzone && el.pdfCategoryInput){
    pdfDropzone.addEventListener('click',()=>el.pdfCategoryInput.click());
    pdfDropzone.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();el.pdfCategoryInput.click();}
    });
    ['dragenter','dragover'].forEach(type=>pdfDropzone.addEventListener(type,event=>{
      event.preventDefault();event.stopPropagation();
      if(event.dataTransfer) event.dataTransfer.dropEffect='copy';
      pdfDropzone.classList.add('drag-active');
    }));
    ['dragleave','dragend'].forEach(type=>pdfDropzone.addEventListener(type,event=>{
      event.preventDefault();event.stopPropagation();
      pdfDropzone.classList.remove('drag-active');
    }));
    pdfDropzone.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();
      pdfDropzone.classList.remove('drag-active');
      const file=event.dataTransfer?.files?.[0];
      if(file) handlePdfCategoryFile(file);
    });
  }

