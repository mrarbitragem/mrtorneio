// LetzPlay data model. One exported type per E-### entity file, same field names.

export type CategoryFormat =
  | "group_knockout"
  | "single_elimination"
  | "consolation_simple"
  | "consolation_double"
  | "double_elimination"
  | "single_group"
  | "king_of_court"
  | "super_8"
  | "super_12";

export interface Category {
  format: CategoryFormat;
  groupCount?: number;
  qualifiersPerGroup?: number;
  scoreFormat: string;
  registrationCap?: number;
  registrationState: "open" | "closed" | "unknown";
  gender?: string;
}

export interface Group {
  label: string;
  finished: boolean;
  needsTieBreak: boolean;
}

export interface Standing {
  rank: number;
  setBalance: number;
  gameBalance: number;
  setRate: number;
  gameRate: number;
}

export interface Entry {
  members: string[];
  group?: string;
}

export interface Match {
  number: number;
  round: string;
  sets?: Array<{ games: number; tiebreak?: number }>;
  scheduledAt?: string;
  court?: string;
  finished: boolean;
}
