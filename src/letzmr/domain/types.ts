/** Tipos de domínio: Grupo + Chaves (G+C) e eliminatória. */

export type CategoryFormat = "GROUP_KO" | "KO";
export type CategoryStatus = "draft" | "open" | "drawn" | "in_progress" | "completed";
export type MatchPhase = "GROUP" | "KO";
export type MatchStatus = "pending" | "scheduled" | "played" | "wo" | "bye";
export type CorrectionKind = "score_only" | "advancement_mismatch";

export interface Place {
  id: string;
  name: string;
  slug: string;
}

export interface Tournament {
  id: string;
  placeId: string;
  name: string;
  /** Set in live mode — owner for isolation checks */
  organizerId?: string;
  startsOn?: string;
  endsOn?: string;
  status: "draft" | "open" | "in_progress" | "completed";
  createdAt: string;
}

/**
 * Como os classificados entram na chave:
 * - BY_GROUP: posição fixa por grupo ("1º G1 × 2º G3").
 * - CROSS_RANKING: os 1ºs colocados são ranqueados entre os grupos
 *   ("1º melhor 1º × 2º do 3º melhor 1º", 4 grupos), como no protótipo Árbitro BT.
 */
export type BracketSeeding = "BY_GROUP" | "CROSS_RANKING";

export interface Category {
  id: string;
  tournamentId: string;
  name: string;
  format: CategoryFormat;
  /** singles | doubles */
  entryType: "singles" | "doubles";
  numGroups: number;
  advancersPerGroup: number;
  /** Ausente em dados antigos = BY_GROUP. */
  bracketSeeding?: BracketSeeding;
  /**
   * Ordem sorteada de grupos usada só para desempatar 1ºs colocados
   * empatados em todos os critérios (modo CROSS_RANKING).
   */
  crossTieDrawOrder?: string[];
  /** Quando o sorteio acima foi feito. Só muda por ação explícita do organizador. */
  crossTieDrawnAt?: string;
  status: CategoryStatus;
  published: boolean;
  createdAt: string;
}

export interface Athlete {
  id: string;
  displayName: string;
}

export interface Registration {
  id: string;
  categoryId: string;
  athleteIds: string[];
  displayName: string;
  seed?: number;
  groupId?: string;
  status: "confirmed" | "withdrawn";
}

export interface Group {
  id: string;
  categoryId: string;
  index: number;
  label: string;
}

/**
 * Placar de um set em games (ex.: 7x6 ou 9x8 no set profissional).
 * Decisão do produto: o dígito do tie-break não é guardado nem exibido.
 */
export interface SetScore {
  gamesA: number;
  gamesB: number;
}

export interface Score {
  sets: SetScore[];
  /** Winner side when WO; games stay 0/0 */
  woSide?: "A" | "B";
  recordedAt: string;
}

export interface Match {
  id: string;
  categoryId: string;
  phase: MatchPhase;
  round: number;
  /** 1-based position within round (KO) or match number in group */
  position: number;
  groupId?: string;
  sideAId?: string; // registration id
  sideBId?: string;
  /** Placeholder labels before materialization */
  placeholderA?: string;
  placeholderB?: string;
  score?: Score;
  status: MatchStatus;
  court?: string;
  scheduledAt?: string;
  winnerRegistrationId?: string;
  /** Next KO match this winner feeds into */
  feedsToMatchId?: string;
  feedsToSlot?: "A" | "B";
}

export interface StandingRow {
  registrationId: string;
  groupId: string;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  setDiff: number;
  gameDiff: number;
  /** null when denominator is zero (technical decision) */
  setPct: number | null;
  gamePct: number | null;
  rank?: number;
  rankSource?: "criteria" | "h2h" | "draw" | "pending_h2h" | "residual_pending";
}

export interface ResidualDraw {
  groupId: string;
  registrationIds: string[];
  order: string[];
  drawnAt: string;
}

export interface CorrectionImpact {
  kind: CorrectionKind;
  divergenceWarning: boolean;
  message: string;
  affectedKoSlots: string[];
  wouldClearAdvancement: boolean;
}

export interface ScheduleConflict {
  athleteId: string;
  athleteName: string;
  matchAId: string;
  matchBId: string;
  categoryAId: string;
  categoryBId: string;
  scheduledAt: string;
  message: string;
}

export interface LetzmrStore {
  version: 1;
  place: Place;
  tournaments: Tournament[];
  categories: Category[];
  athletes: Athlete[];
  registrations: Registration[];
  groups: Group[];
  matches: Match[];
  residualDraws: ResidualDraw[];
}
