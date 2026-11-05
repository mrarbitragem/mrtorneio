export type JogosMatch = {
  date: Date | string | number | null;
  time: string;
  category: string;
  phase: string;
  player1: string;
  player2: string;
  result: string;
};

export type SaidaMatch = {
  date: Date | string | number | null;
  time: string;
  category: string;
  phase: string;
  player1: string;
  player2: string;
  result: string;
};

export type ConvertedJogosExcel = {
  xlsxBytes: Uint8Array;
  matchCount: number;
  blockCount: number;
  filename: string;
};
