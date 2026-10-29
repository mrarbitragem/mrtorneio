import {
  bindCrossRanking,
  buildKoMatchesFromPreset,
  expectedQualifiersFromStandings,
  materializeKoSlots,
  pairingsUseCrossRanking,
  propagateByeWinners,
  rankFirstPlaces,
  resolveBracketPairings,
} from "../domain/bracket";
import {
  assignGroups,
  buildDirectKoBracket,
  buildRoundRobinMatches,
  performResidualDraw,
} from "../domain/draw";
import { newId } from "../domain/ids";
import {
  advanceWinnerInBracket,
  analyzeCorrectionImpact,
  applyScoreToMatch,
  buildPlayedScore,
  buildWoScore,
  clearAdvancementFromMatch,
  clearMatchScore,
  orderChanged,
} from "../domain/score";
import { isGroupComplete } from "../domain/publicDraw";
import { findCrossCategoryConflicts } from "../domain/schedule";
import { computeGroupStandings, rankGroup } from "../domain/standings";
import type {
  Athlete,
  BracketSeeding,
  Category,
  CategoryFormat,
  CorrectionImpact,
  LetzmrStore,
  Match,
  Registration,
  ResidualDraw,
  ScheduleConflict,
  SetScore,
  StandingRow,
  Tournament,
} from "../domain/types";
import { loadStore, saveStore } from "./localStore";

export type Engine = ReturnType<typeof createEngine>;

export type EngineOptions = {
  /** When false, engine keeps state in memory only (outer layer persists). */
  autoLocalPersist?: boolean;
  organizerId?: string | null;
};

export function createEngine(initial?: LetzmrStore, options: EngineOptions = {}) {
  let store: LetzmrStore = initial ?? loadStore();
  const autoLocalPersist = options.autoLocalPersist !== false;
  let organizerId = options.organizerId ?? null;

  const persist = () => {
    if (autoLocalPersist) saveStore(store);
  };

  const api = {
    getStore: () => store,
    setOrganizerId: (id: string | null) => {
      organizerId = id;
    },
    getOrganizerId: () => organizerId,
    replaceStore: (s: LetzmrStore) => {
      store = s;
      persist();
    },

    createTournament: (name: string): Tournament => {
      const t: Tournament = {
        id: newId("t"),
        placeId: store.place.id,
        name,
        organizerId: organizerId ?? undefined,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      store = { ...store, tournaments: [...store.tournaments, t] };
      persist();
      return t;
    },

    createCategory: (args: {
      tournamentId: string;
      name: string;
      format: CategoryFormat;
      entryType: "singles" | "doubles";
      numGroups?: number;
      advancersPerGroup?: number;
      bracketSeeding?: BracketSeeding;
    }): Category => {
      if (args.format !== "GROUP_KO" && args.format !== "KO") {
        throw new Error("Formato fora do MVP");
      }
      const numGroups = args.format === "GROUP_KO" ? args.numGroups ?? 2 : 0;
      const advancersPerGroup = args.format === "GROUP_KO" ? args.advancersPerGroup ?? 2 : 0;
      const bracketSeeding: BracketSeeding = args.bracketSeeding ?? "BY_GROUP";
      if (args.format === "GROUP_KO") {
        // Falha na criação, não só no sorteio, se a regra não existe para a configuração.
        resolveBracketPairings(numGroups, advancersPerGroup, bracketSeeding);
      }
      const c: Category = {
        id: newId("c"),
        tournamentId: args.tournamentId,
        name: args.name,
        format: args.format,
        entryType: args.entryType,
        numGroups,
        advancersPerGroup,
        bracketSeeding: args.format === "GROUP_KO" ? bracketSeeding : undefined,
        status: "open",
        published: false,
        createdAt: new Date().toISOString(),
      };
      store = { ...store, categories: [...store.categories, c] };
      persist();
      return c;
    },

    ensureAthlete: (displayName: string): Athlete => {
      const existing = store.athletes.find(
        (a) => a.displayName.toLowerCase() === displayName.toLowerCase(),
      );
      if (existing) return existing;
      const a: Athlete = { id: newId("ath"), displayName };
      store = { ...store, athletes: [...store.athletes, a] };
      persist();
      return a;
    },

    register: (args: {
      categoryId: string;
      names: string[];
      seed?: number;
    }): Registration => {
      const cat = store.categories.find((c) => c.id === args.categoryId);
      if (!cat) throw new Error("Categoria não encontrada");
      if (cat.entryType === "doubles" && args.names.length !== 2) {
        throw new Error("Dupla exige 2 atletas");
      }
      if (cat.entryType === "singles" && args.names.length !== 1) {
        throw new Error("Simples exige 1 atleta");
      }
      const athletes = args.names.map((n) => api.ensureAthlete(n));
      const r: Registration = {
        id: newId("reg"),
        categoryId: args.categoryId,
        athleteIds: athletes.map((a) => a.id),
        displayName: athletes.map((a) => a.displayName).join(" / "),
        seed: args.seed,
        status: "confirmed",
      };
      store = { ...store, registrations: [...store.registrations, r] };
      persist();
      return r;
    },

    generateDraw: (categoryId: string, rng?: () => number) => {
      const cat = store.categories.find((c) => c.id === categoryId);
      if (!cat) throw new Error("Categoria não encontrada");
      const regs = store.registrations.filter(
        (r) => r.categoryId === categoryId && r.status === "confirmed",
      );
      if (regs.length < 2) throw new Error("Mínimo 2 inscritos");

      // Clear previous draw artifacts for category
      store = {
        ...store,
        groups: store.groups.filter((g) => g.categoryId !== categoryId),
        matches: store.matches.filter((m) => m.categoryId !== categoryId),
        residualDraws: store.residualDraws.filter((d) => {
          const g = store.groups.find((x) => x.id === d.groupId);
          return g?.categoryId !== categoryId;
        }),
        registrations: store.registrations.map((r) =>
          r.categoryId === categoryId ? { ...r, groupId: undefined } : r,
        ),
      };

      if (cat.format === "KO") {
        const matches = buildDirectKoBracket(
          categoryId,
          regs.map((r) => r.id),
        );
        store = {
          ...store,
          matches: [...store.matches, ...matches],
          categories: store.categories.map((c) =>
            c.id === categoryId ? { ...c, status: "drawn" } : c,
          ),
        };
        persist();
        return;
      }

      // Validate preset exists before drawing
      const pairings = resolveBracketPairings(
        cat.numGroups,
        cat.advancersPerGroup,
        cat.bracketSeeding ?? "BY_GROUP",
      );

      const { groups, registrations: assigned } = assignGroups(
        categoryId,
        regs,
        cat.numGroups,
        rng,
      );
      const groupMatches: Match[] = [];
      for (const g of groups) {
        const ids = assigned.filter((r) => r.groupId === g.id).map((r) => r.id);
        groupMatches.push(...buildRoundRobinMatches(categoryId, g.id, ids));
      }
      const ko = buildKoMatchesFromPreset(categoryId, pairings);

      store = {
        ...store,
        groups: [...store.groups, ...groups],
        registrations: store.registrations.map((r) => {
          const u = assigned.find((a) => a.id === r.id);
          return u ?? r;
        }),
        matches: [...store.matches, ...groupMatches, ...ko],
        categories: store.categories.map((c) =>
          c.id === categoryId
            ? { ...c, status: "drawn", crossTieDrawOrder: undefined, crossTieDrawnAt: undefined }
            : c,
        ),
      };
      persist();
    },

    getGroupStandings: (groupId: string): {
      ranked: StandingRow[];
      residualPending: string[];
      pendingH2h: string[][];
    } => {
      const regs = store.registrations;
      const matches = store.matches;
      const rows = computeGroupStandings(groupId, regs, matches);
      const draw = store.residualDraws.find((d) => d.groupId === groupId);
      return rankGroup(rows, matches, groupId, draw?.order);
    },

    recordScore: (
      matchId: string,
      sets: SetScore[],
    ): { match: Match; conflicts: ScheduleConflict[] } => {
      const match = store.matches.find((m) => m.id === matchId);
      if (!match) throw new Error("Jogo não encontrado");
      const scored = applyScoreToMatch(match, buildPlayedScore(sets));
      let matches = store.matches.map((m) => (m.id === matchId ? scored : m));
      matches = advanceWinnerInBracket(matches, scored);
      store = {
        ...store,
        matches,
        categories: store.categories.map((c) =>
          c.id === match.categoryId && c.status === "drawn"
            ? { ...c, status: "in_progress" }
            : c,
        ),
      };
      persist();
      return { match: scored, conflicts: [] };
    },

    recordWo: (matchId: string, woSide: "A" | "B"): Match => {
      const match = store.matches.find((m) => m.id === matchId);
      if (!match) throw new Error("Jogo não encontrado");
      const scored = applyScoreToMatch(match, buildWoScore(woSide));
      let matches = store.matches.map((m) => (m.id === matchId ? scored : m));
      matches = advanceWinnerInBracket(matches, scored);
      store = { ...store, matches };
      persist();
      return scored;
    },

    previewCancelImpact: (matchId: string): CorrectionImpact => {
      const match = store.matches.find((m) => m.id === matchId);
      if (!match) throw new Error("Jogo não encontrado");
      const cat = store.categories.find((c) => c.id === match.categoryId)!;
      if (match.phase !== "GROUP") {
        return {
          kind: "score_only",
          divergenceWarning: false,
          message: "Cancelamento de placar de eliminatória.",
          affectedKoSlots: [],
          wouldClearAdvancement: true,
        };
      }

      const before = api.getGroupStandings(match.groupId!).ranked;
      // simulate clear
      const cleared = clearMatchScore(match);
      const simMatches = store.matches.map((m) => (m.id === matchId ? cleared : m));
      const rows = computeGroupStandings(match.groupId!, store.registrations, simMatches);
      const draw = store.residualDraws.find((d) => d.groupId === match.groupId);
      const after = rankGroup(rows, simMatches, match.groupId!, draw?.order).ranked;

      const standingsByGroup = new Map<string, StandingRow[]>();
      for (const g of store.groups.filter((x) => x.categoryId === cat.id)) {
        if (g.id === match.groupId) standingsByGroup.set(g.id, after);
        else standingsByGroup.set(g.id, api.getGroupStandings(g.id).ranked);
      }
      const expected = expectedQualifiersFromStandings(
        standingsByGroup,
        cat.advancersPerGroup,
      );
      const ko = store.matches.filter((m) => m.categoryId === cat.id && m.phase === "KO");
      const materialized = ko
        .filter((m) => m.round === 1)
        .flatMap((m) => [m.sideAId, m.sideBId])
        .filter((id): id is string => Boolean(id));

      const changed = orderChanged(before, after, cat.advancersPerGroup);

      // Ranking cruzado: compara também a ordem dos 1ºs colocados entre os grupos.
      let crossOrderChanged = false;
      if ((cat.bracketSeeding ?? "BY_GROUP") === "CROSS_RANKING") {
        const catGroups = store.groups.filter((g) => g.categoryId === cat.id);
        const beforeByGroup = new Map<string, StandingRow[]>();
        for (const g of catGroups) beforeByGroup.set(g.id, api.getGroupStandings(g.id).ranked);
        const rankBefore = rankFirstPlaces({
          groups: catGroups,
          standingsByGroup: beforeByGroup,
          matches: store.matches.filter((m) => m.categoryId === cat.id),
          tieDrawOrder: cat.crossTieDrawOrder,
        });
        const rankAfter = rankFirstPlaces({
          groups: catGroups,
          standingsByGroup,
          matches: simMatches.filter((m) => m.categoryId === cat.id),
          tieDrawOrder: cat.crossTieDrawOrder,
        });
        crossOrderChanged =
          rankBefore.orderedGroupIds.join("|") !== rankAfter.orderedGroupIds.join("|") ||
          rankBefore.tiedGroupIds.length !== rankAfter.tiedGroupIds.length;
      }

      return analyzeCorrectionImpact({
        groupMatch: match,
        koMatches: ko,
        expectedQualifierIds: expected,
        materializedQualifierIds: materialized,
        standingsChangedOrder: changed,
        crossOrderChanged,
      });
    },

    cancelScore: (
      matchId: string,
      opts: { correctionKind: "score_only" | "advancement_mismatch"; confirmClear?: boolean },
    ): { impact: CorrectionImpact } => {
      const match = store.matches.find((m) => m.id === matchId);
      if (!match) throw new Error("Jogo não encontrado");
      const impact =
        match.phase === "GROUP"
          ? api.previewCancelImpact(matchId)
          : {
              kind: "score_only" as const,
              divergenceWarning: false,
              message: "Cancelamento KO",
              affectedKoSlots: [],
              wouldClearAdvancement: Boolean(opts.confirmClear),
            };

      let matches = store.matches.map((m) =>
        m.id === matchId ? clearMatchScore(m) : m,
      );

      if (match.phase === "KO" || opts.confirmClear) {
        matches = clearAdvancementFromMatch(matches, { ...match, ...clearMatchScore(match) });
        // also clear this match's feed
        const cleared = matches.find((m) => m.id === matchId)!;
        matches = clearAdvancementFromMatch(matches, cleared);
      }

      if (
        match.phase === "GROUP" &&
        opts.correctionKind === "advancement_mismatch" &&
        opts.confirmClear
      ) {
        // Clear round-1 KO sides that came from groups (full rematerialize needed)
        matches = matches.map((m) => {
          if (m.categoryId !== match.categoryId || m.phase !== "KO") return m;
          if (m.round !== 1) {
            return {
              ...m,
              sideAId: undefined,
              sideBId: undefined,
              score: undefined,
              winnerRegistrationId: undefined,
              status: m.scheduledAt ? "scheduled" : "pending",
              placeholderA: m.placeholderA ?? "A definir",
              placeholderB: m.placeholderB ?? "A definir",
            };
          }
          return {
            ...m,
            sideAId: undefined,
            sideBId: undefined,
            score: undefined,
            winnerRegistrationId: undefined,
            status: m.status === "bye" ? "bye" : m.scheduledAt ? "scheduled" : "pending",
            placeholderA: m.placeholderA ?? "A definir",
            placeholderB: m.placeholderB ?? "A definir",
          };
        });
      }

      store = { ...store, matches };
      persist();
      return { impact };
    },

    materializeBracket: (categoryId: string) => {
      const cat = store.categories.find((c) => c.id === categoryId);
      if (!cat || cat.format !== "GROUP_KO") throw new Error("Categoria G+C requerida");
      const groups = store.groups.filter((g) => g.categoryId === categoryId);
      let pairings = resolveBracketPairings(
        cat.numGroups,
        cat.advancersPerGroup,
        cat.bracketSeeding ?? "BY_GROUP",
      );
      if (pairingsUseCrossRanking(pairings)) {
        // Antes de olhar empates: sem todos os grupos concluídos não há ranking de 1ºs.
        const open = groups.find((g) => !isGroupComplete(store.matches, g.id));
        if (open) {
          throw new Error(
            `Ranking cruzado: conclua todos os jogos de todos os grupos antes de montar a chave (faltam jogos em ${open.label}).`,
          );
        }
      }
      const standingsByGroup = new Map<string, StandingRow[]>();
      const groupIndexToId = new Map<number, string>();
      for (const g of groups) {
        groupIndexToId.set(g.index, g.id);
        const { ranked, residualPending } = api.getGroupStandings(g.id);
        if (residualPending.length) {
          throw new Error(
            `Grupo ${g.label}: empate residual pendente — use classificar após sorteio`,
          );
        }
        if (ranked.some((r) => r.rankSource === "pending_h2h")) {
          throw new Error(`Grupo ${g.label}: confronto direto pendente`);
        }
        standingsByGroup.set(g.id, ranked);
      }
      if (pairingsUseCrossRanking(pairings)) {
        const ranking = rankFirstPlaces({
          groups,
          standingsByGroup,
          matches: store.matches.filter((m) => m.categoryId === categoryId),
          tieDrawOrder: cat.crossTieDrawOrder,
        });
        if (ranking.tiedGroupIds.length) {
          const labels = ranking.tiedGroupIds
            .map((ids) => ids.map((id) => groups.find((g) => g.id === id)?.label).join(", "))
            .join(" | ");
          throw new Error(
            `Empate entre 1ºs colocados (${labels}) em ${ranking.criteria}. Faça o sorteio de desempate dos 1ºs.`,
          );
        }
        const indexById = new Map(groups.map((g) => [g.id, g.index]));
        pairings = bindCrossRanking(
          pairings,
          ranking.orderedGroupIds.map((id) => indexById.get(id) as number),
        );
      }
      const ko = store.matches.filter((m) => m.categoryId === categoryId && m.phase === "KO");
      let nextKo = materializeKoSlots(ko, pairings, groupIndexToId, standingsByGroup);
      // merge back
      let matches = store.matches.map((m) => {
        const u = nextKo.find((k) => k.id === m.id);
        return u ?? m;
      });
      matches = propagateByeWinners(matches);
      // propagate again for chained byes
      matches = propagateByeWinners(matches);
      store = { ...store, matches };
      persist();
    },

    /** Ranking atual dos 1ºs colocados (só faz sentido no modo CROSS_RANKING). */
    getFirstPlaceRanking: (categoryId: string) => {
      const cat = store.categories.find((c) => c.id === categoryId);
      if (!cat || cat.format !== "GROUP_KO") throw new Error("Categoria G+C requerida");
      const groups = store.groups.filter((g) => g.categoryId === categoryId);
      const standingsByGroup = new Map<string, StandingRow[]>();
      for (const g of groups) standingsByGroup.set(g.id, api.getGroupStandings(g.id).ranked);
      return {
        groups,
        allGroupsComplete: groups.length > 0 && groups.every((g) => isGroupComplete(store.matches, g.id)),
        ...rankFirstPlaces({
          groups,
          standingsByGroup,
          matches: store.matches.filter((m) => m.categoryId === categoryId),
          tieDrawOrder: cat.crossTieDrawOrder,
        }),
      };
    },

    /**
     * Sorteia a ordem usada só para separar 1ºs colocados empatados em tudo.
     * O resultado fica gravado na categoria; só é refeito com `opts.redo: true`
     * (ação explícita do organizador). Nunca é refeito sozinho.
     */
    drawFirstPlaceTie: (
      categoryId: string,
      rng?: () => number,
      opts: { redo?: boolean } = {},
    ): string[] => {
      const cat = store.categories.find((c) => c.id === categoryId);
      if (!cat || cat.format !== "GROUP_KO") throw new Error("Categoria G+C requerida");
      if ((cat.bracketSeeding ?? "BY_GROUP") !== "CROSS_RANKING") {
        throw new Error("Esta categoria posiciona a chave por grupo, sem ranking de 1ºs.");
      }
      if (cat.crossTieDrawOrder && !opts.redo) {
        throw new Error(
          "O sorteio dos 1ºs já está gravado. Para refazer, use a ação explícita “Refazer sorteio”.",
        );
      }
      const ranking = api.getFirstPlaceRanking(categoryId);
      if (!ranking.tiedGroupIds.length && !ranking.resolvedByDrawGroupIds.length) {
        throw new Error("Não há empate entre 1ºs colocados para sortear.");
      }
      const koMatches = store.matches.filter(
        (m) => m.categoryId === categoryId && m.phase === "KO",
      );
      if (koMatches.some((m) => m.score)) {
        throw new Error(
          "A eliminatória já tem resultados lançados. Cancele-os antes de refazer o sorteio dos 1ºs.",
        );
      }
      const groups = store.groups.filter((g) => g.categoryId === categoryId);
      const order = performResidualDraw(
        groups.map((g) => g.id),
        rng,
      );
      const hadBracket = koMatches.some((m) => m.round === 1 && (m.sideAId || m.sideBId));
      store = {
        ...store,
        categories: store.categories.map((c) =>
          c.id === categoryId
            ? { ...c, crossTieDrawOrder: order, crossTieDrawnAt: new Date().toISOString() }
            : c,
        ),
      };
      persist();
      // Se a chave já estava montada, remonta com a nova ordem (sem placar a perder).
      if (hadBracket && ranking.allGroupsComplete) api.materializeBracket(categoryId);
      return order;
    },

    applyResidualDraw: (groupId: string, rng?: () => number): ResidualDraw => {
      const { residualPending } = api.getGroupStandings(groupId);
      if (!residualPending.length) throw new Error("Sem empate residual");
      const order = performResidualDraw(residualPending, rng);
      const draw: ResidualDraw = {
        groupId,
        registrationIds: residualPending,
        order,
        drawnAt: new Date().toISOString(),
      };
      store = {
        ...store,
        residualDraws: [
          ...store.residualDraws.filter((d) => d.groupId !== groupId),
          draw,
        ],
      };
      persist();
      return draw;
    },

    scheduleMatch: (
      matchId: string,
      scheduledAt: string,
      court?: string,
    ): { conflicts: ScheduleConflict[] } => {
      store = {
        ...store,
        matches: store.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                scheduledAt,
                court,
                status: m.status === "pending" ? "scheduled" : m.status,
              }
            : m,
        ),
      };
      persist();
      const conflicts = findCrossCategoryConflicts({
        matches: store.matches,
        registrations: store.registrations,
        athletes: store.athletes,
        focusMatchId: matchId,
      });
      return { conflicts };
    },

    setPublished: (categoryId: string, published: boolean) => {
      store = {
        ...store,
        categories: store.categories.map((c) =>
          c.id === categoryId ? { ...c, published } : c,
        ),
      };
      persist();
    },

    completeCategory: (categoryId: string) => {
      store = {
        ...store,
        categories: store.categories.map((c) =>
          c.id === categoryId ? { ...c, status: "completed" } : c,
        ),
      };
      persist();
    },

    regName: (id?: string) =>
      store.registrations.find((r) => r.id === id)?.displayName ?? "—",
  };

  return api;
}

let singleton: Engine | null = null;

export function getEngine(): Engine {
  if (!singleton) singleton = createEngine(undefined, { autoLocalPersist: false });
  return singleton;
}

export function resetEngine(seed?: LetzmrStore, options?: EngineOptions): Engine {
  singleton = createEngine(seed, {
    autoLocalPersist: false,
    ...options,
  });
  return singleton;
}
