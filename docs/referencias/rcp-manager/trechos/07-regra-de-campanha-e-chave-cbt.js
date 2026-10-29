/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 3223-3330, 3897-3925, 4401-4445, 4481-4497 e 4620-4787.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 3223-3330 ----
  function standardSeedPositions(size) {
    let positions = [1,2];
    let bracket = 2;
    while (bracket < size) {
      bracket *= 2;
      positions = positions.flatMap(p => [p, bracket + 1 - p]);
    }
    return positions;
  }

  // Sorteio por campanha inspirado na distribuição por faixas do beach tennis.
  // #1 e #2 têm posições fixas. #3/#4 são um sorteio binário justo entre
  // as duas metades; as demais faixas são sorteadas independentemente.
  // O resultado é persistido: abrir a página nunca refaz um sorteio salvo.
  function lotteryIndex(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1) throw new Error('Faixa inválida para sorteio.');
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const top = 4294967296;
        const limit = top - (top % maxExclusive);
        const result = new Uint32Array(1);
        do { crypto.getRandomValues(result); } while (result[0] >= limit);
        return result[0] % maxExclusive;
      }
    } catch (error) {
      console.warn('Sorteio criptográfico indisponível. Usando gerador local.', error);
    }
    return Math.floor(Math.random() * maxExclusive);
  }
  function lotteryShuffle(values) {
    const output = [...values];
    for (let i = output.length - 1; i > 0; i -= 1) {
      const j = lotteryIndex(i + 1);
      [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
  }
  function isValidSeedDrawOrder(order, count) {
    if (!Array.isArray(order) || order.length !== count) return false;
    if (new Set(order).size !== count || order.some(n => !Number.isInteger(n) || n < 1 || n > count)) return false;
    if (order[0] !== 1 || (count >= 2 && order[1] !== 2)) return false;
    for (let start = 3; start <= count; start = 2 * (start - 1) + 1) {
      const end = Math.min(count, start * 2 - 2);
      const tier = order.slice(start - 1, end).slice().sort((a,b) => a-b);
      const expected = Array.from({length:end - start + 1}, (_, idx) => start + idx);
      if (tier.some((n, idx) => n !== expected[idx])) return false;
    }
    return true;
  }

  function drawSeedOrder(count, previousOrder=null) {
    if (isValidSeedDrawOrder(previousOrder, count)) return [...previousOrder];
    const order = Array.from({length:count}, (_,idx) => idx + 1);
    // Uma moeda justa determina qual de 3/4 recebe a posição superior.
    if (count >= 4 && lotteryIndex(2) === 1) [order[2], order[3]] = [order[3], order[2]];
    // Distribuição uniforme dos demais cabeças em suas faixas.
    for (let start = 5; start <= count; start = 2 * (start - 1) + 1) {
      const end = Math.min(count, start * 2 - 2);
      const tier = lotteryShuffle(order.slice(start - 1, end));
      order.splice(start - 1, tier.length, ...tier);
    }
    return order;
  }

  function getDrawFirstRoundSeedSlots(bracket) {
    const slots = new Map();
    (bracket?.rounds?.[0]?.matches || []).forEach((match, index) => {
      [match.sideA, match.sideB].forEach((side, sideIndex) => {
        if (side?.isWinner && Number.isInteger(Number(side.seedNumber))) {
          slots.set(Number(side.seedNumber), (index * 2) + sideIndex + 1);
        }
      });
    });
    return slots;
  }

  function validateSeedPlacement(bracket, winnerCount) {
    if (!bracket || winnerCount < 2) return true;
    const slots = getDrawFirstRoundSeedSlots(bracket);
    const size = bracket.size;
    const a = slots.get(1), b = slots.get(2);
    if (a !== 1 || b !== size) return false;
    if (winnerCount >= 4) {
      const c = slots.get(3), d = slots.get(4);
      if (!c || !d || halfOfSlot(c, size) === halfOfSlot(d, size)) return false;
      if (halfOfSlot(c, size) === halfOfSlot(a, size) && halfOfSlot(d, size) === halfOfSlot(b, size)) return true;
      if (halfOfSlot(d, size) === halfOfSlot(a, size) && halfOfSlot(c, size) === halfOfSlot(b, size)) return true;
      return false;
    }
    return true;
  }

  function renderSeedDrawAudit(bracket, winnerCount) {
    if (!bracket || winnerCount < 2) return '';
    const slots = getDrawFirstRoundSeedSlots(bracket);
    const size = bracket.size;
    if (!validateSeedPlacement(bracket, winnerCount)) {
      return '<span class="warn">Verificação de posições: inconsistência identificada. Confira a chave antes de iniciar as partidas.</span>';
    }
    let text = `Sorteio salvo: #1 na linha 1; #2 na linha ${size}.`;
    if (winnerCount >= 4) {
      text += ` #3 na metade ${halfOfSlot(slots.get(3),size) === 1 ? 'superior' : 'inferior'} (linha ${slots.get(3)});`;
      text += ` #4 na metade ${halfOfSlot(slots.get(4),size) === 1 ? 'superior' : 'inferior'} (linha ${slots.get(4)}).`;
    }
    text += ' Cabeças 3/4 têm duas disposições possíveis, definidas por sorteio.';
    return `<span class="small muted" title="A distribuição sorteada fica gravada no torneio até usar Refazer sorteio.">${escapeHtml(text)}</span>`;
  }


// ---- linhas 3897-3925 ----
  function getGroupStructure(total) {
    if (total < 3) throw new Error('O sistema foi preparado para 3 a 128 participantes/duplas.');
    if (total <= 5) {
      return { mode: 'roundRobin', groupCount: 1, sizes: [total], description: `${total} duplas: todos contra todos (Round Robin)` };
    }
    const baseGroups = Math.floor(total / 3);
    const remainder = total % 3;
    const count4Groups = remainder;
    const count3Groups = baseGroups - count4Groups;
    const sizes = [
      ...Array(count3Groups).fill(3),
      ...Array(count4Groups).fill(4)
    ];
    const count3 = sizes.filter(s => s === 3).length;
    const count4 = sizes.filter(s => s === 4).length;
    const label = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
    let description = '';
    if (count4 === 0) description = `${label(baseGroups, 'grupo', 'grupos')} de 3 duplas`;
    else if (count3 === 0) description = `${label(baseGroups, 'grupo', 'grupos')} de 4 duplas`;
    else description = `${label(baseGroups, 'grupo', 'grupos')} (${label(count3, 'grupo', 'grupos')} de 3 e ${label(count4, 'grupo', 'grupos')} de 4)`;
    return { mode: 'groups', groupCount: baseGroups, sizes, description };
  }

  function qualificationRule(total, groupCount) {
    if (total <= 5) return { kind: 'champion_only', perGroup: 0, description: 'Até 5 duplas: campeão definido pelo melhor desempenho no Round Robin.' };
    if (total >= 6 && total <= 8) return { kind: 'top2', perGroup: 2, description: 'De 6 a 8 duplas: classificam-se as 2 primeiras de cada grupo para a semifinal.' };
    if (total >= 9 && total <= 47) return { kind: 'top2', perGroup: 2, description: 'De 9 a 47 duplas: classificam-se as 2 primeiras de cada grupo para a fase eliminatória.' };
    return { kind: 'top1', perGroup: 1, description: 'De 48 a 128 duplas: classifica-se apenas a 1ª dupla de cada grupo para a fase eliminatória.' };
  }

// ---- linhas 4401-4445 ----
  function deriveQualified(category) {
    if (!category || !category.groups.length) return { qualified: [], seeds: [], structure: null, qualification: null };
    const summary = getCategorySummary(category);
    const rankings = allGroupRankings(category);
    const qualified = [];

    if (summary.qualification.kind === 'champion_only') {
      const rr = rankings[0]?.ranking || [];
      return {
        qualified: rr.length ? [{ ...rr[0], qualifiedType: 'Campeã', sourceGroup: rankings[0].group.name }] : [],
        seeds: [], structure: summary.structure, qualification: summary.qualification
      };
    }

    rankings.forEach(item => {
      const ranking = item.ranking;
      if (summary.qualification.perGroup >= 1 && ranking[0]) qualified.push({ ...ranking[0], qualifiedType:'1º lugar', sourceGroup:item.group.name, isWinner:true });
      if (summary.qualification.perGroup >= 2 && ranking[1]) qualified.push({ ...ranking[1], qualifiedType:'2º lugar', sourceGroup:item.group.name, isWinner:false });
    });

    const winners = qualified.filter(q => q.isWinner);
    const sameGroupSize = category.groups.every(g => g.size === category.groups[0].size);
    const seeds = [...winners].sort((a,b) => {
      if (sameGroupSize) {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.setDiff !== b.setDiff) return b.setDiff - a.setDiff;
        if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff;
      } else {
        if (a.setAverage !== b.setAverage) return b.setAverage - a.setAverage;
        if (a.gameAverage !== b.gameAverage) return b.gameAverage - a.gameAverage;
      }
      if (a.ranking !== b.ranking) return a.ranking - b.ranking;
      return a.drawOrder - b.drawOrder;
    }).map((q, idx) => ({
      ...q, seedNumber: idx + 1,
      seedRule: sameGroupSize ? 'Vitórias / saldo de sets / saldo de games / ranking' : 'Sets average / games average / ranking'
    }));

    const seedMap = Object.fromEntries(seeds.map(s => [s.id, s.seedNumber]));
    return {
      qualified: qualified.map(q => ({ ...q, seedNumber: q.isWinner ? seedMap[q.id] : null })),
      seeds, structure: summary.structure, qualification: summary.qualification, sameGroupSize
    };
  }


// ---- linhas 4481-4497 ----
  function compareCampaign(a, b, sameGroupSize) {
    if (sameGroupSize) {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.setDiff !== b.setDiff) return b.setDiff - a.setDiff;
      if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff;
    } else {
      if (a.setAverage !== b.setAverage) return b.setAverage - a.setAverage;
      if (a.gameAverage !== b.gameAverage) return b.gameAverage - a.gameAverage;
    }
    if (a.ranking !== b.ranking) return a.ranking - b.ranking;
    return a.drawOrder - b.drawOrder;
  }

  function ordinalBestCampaignLabel(seedNumber) {
    return `${seedNumber}ª melhor campanha`;
  }


// ---- linhas 4620-4787 ----
  function createCbtEliminationTemplate(data, formatPreset, previousDrawOrder=null) {
    const qualified = (data.qualified || []).map(qualifiedDescriptor);
    const winners = (data.seeds || []).map(qualifiedDescriptor).sort((a, b) => (a.seedNumber || 999) - (b.seedNumber || 999));
    const runnerByGroup = new Map(
      qualified.filter(item => !item.isWinner).map(item => [item.group, item])
    );

    if (data.qualification?.kind !== 'top2' || winners.length < 2 || winners.length > 8 || qualified.length !== winners.length * 2) {
      return null;
    }

    const templateByWinnerCount = {
      2: {
        size: 4,
        slots: {
          1: { winner: 0 },
          2: { runnerOfWinner: 1 },
          3: { runnerOfWinner: 0 },
          4: { winner: 1 }
        },
        byeRecipients: []
      },
      3: {
        size: 8,
        slots: {
          1: { winner: 0 },
          3: { runnerOfWinner: 1 },
          4: { runnerOfWinner: 2 },
          5: { winner: 2 },
          6: { runnerOfWinner: 0 },
          8: { winner: 1 }
        },
        byeRecipients: [{ winner: 0 }, { winner: 1 }]
      },
      4: {
        size: 8,
        slots: {
          1: { winner: 0 },
          2: { runnerOfWinner: 2 },
          3: { winner: 3 },
          4: { runnerOfWinner: 1 },
          5: { winner: 2 },
          6: { runnerOfWinner: 0 },
          7: { runnerOfWinner: 3 },
          8: { winner: 1 }
        },
        byeRecipients: []
      },
      5: {
        size: 16,
        slots: {
          1: { winner: 0 },
          3: { runnerOfWinner: 1 },
          4: { runnerOfWinner: 2 },
          5: { winner: 3 },
          8: { winner: 4 },
          9: { runnerOfWinner: 0 },
          12: { winner: 2 },
          13: { runnerOfWinner: 3 },
          14: { runnerOfWinner: 4 },
          16: { winner: 1 }
        },
        byeRecipients: [{ winner: 0 }, { winner: 1 }, { winner: 2 }, { winner: 3 }, { winner: 4 }, { runnerOfWinner: 0 }]
      },
      6: {
        size: 16,
        slots: {
          1: { winner: 0 },
          3: { runnerOfWinner: 1 },
          4: { runnerOfWinner: 2 },
          5: { winner: 3 },
          7: { winner: 4 },
          8: { runnerOfWinner: 5 },
          9: { winner: 5 },
          10: { runnerOfWinner: 4 },
          11: { winner: 2 },
          13: { runnerOfWinner: 0 },
          14: { runnerOfWinner: 3 },
          16: { winner: 1 }
        },
        byeRecipients: [{ winner: 0 }, { winner: 1 }, { winner: 2 }, { winner: 3 }]
      },
      7: {
        size: 16,
        slots: {
          1: { winner: 0 },
          3: { runnerOfWinner: 5 },
          4: { runnerOfWinner: 6 },
          5: { winner: 3 },
          6: { runnerOfWinner: 1 },
          7: { winner: 4 },
          8: { runnerOfWinner: 2 },
          9: { winner: 5 },
          10: { runnerOfWinner: 4 },
          11: { winner: 2 },
          12: { runnerOfWinner: 0 },
          13: { winner: 6 },
          14: { runnerOfWinner: 3 },
          16: { winner: 1 }
        },
        byeRecipients: [{ winner: 0 }, { winner: 1 }]
      },
      8: {
        size: 16,
        slots: {
          1: { winner: 0 },
          2: { runnerOfWinner: 7 },
          3: { winner: 6 },
          4: { runnerOfWinner: 5 },
          5: { winner: 3 },
          6: { runnerOfWinner: 1 },
          7: { winner: 4 },
          8: { runnerOfWinner: 2 },
          9: { winner: 5 },
          10: { runnerOfWinner: 4 },
          11: { winner: 2 },
          12: { runnerOfWinner: 0 },
          13: { winner: 7 },
          14: { runnerOfWinner: 3 },
          15: { runnerOfWinner: 6 },
          16: { winner: 1 }
        },
        byeRecipients: []
      }
    };

    const template = templateByWinnerCount[winners.length];
    if (!template) return null;
    const seedDrawOrder = drawSeedOrder(winners.length, previousDrawOrder);

    const slots = Array.from({ length: template.size }, (_, idx) => ({ slot: idx + 1, id:null, team:null, group:null, label:'', seedNumber:null, isWinner:false }));

    function resolveTemplateEntry(ref) {
      if (!ref) return null;
      if (Object.prototype.hasOwnProperty.call(ref, 'winner')) return winners[seedDrawOrder[ref.winner] - 1] || null;
      if (Object.prototype.hasOwnProperty.call(ref, 'runnerOfWinner')) return runnerByGroup.get(winners[seedDrawOrder[ref.runnerOfWinner] - 1]?.group || '') || null;
      return null;
    }

    Object.entries(template.slots).forEach(([slotNumber, ref]) => {
      applyEntryToSlot(slots[Number(slotNumber) - 1], resolveTemplateEntry(ref));
    });

    const rounds = buildEliminationRounds(template.size, formatPreset);
    fillFirstRoundFromSlots(rounds, slots);
    if (!validateSeedPlacement({size:template.size,rounds}, winners.length)) {
      throw new Error('Distribuição inválida dos cabeças de chave no sorteio por campanhas.');
    }

    const byeCount = template.size - qualified.length;
    const byeRecipients = (template.byeRecipients || [])
      .map(resolveTemplateEntry)
      .filter(Boolean)
      .map(item => ({ ...item }));

    return {
      engineVersion: ELIMINATION_ENGINE_VERSION,
      signature: buildQualificationSignature(data),
      size: template.size,
      byeCount,
      byeRecipients,
      rounds,
      cbtTemplate: `top2_${winners.length}_groups_campaign_template`,
      seedDrawOrder,
      seedDrawAt: new Date().toISOString()
    };
  }


