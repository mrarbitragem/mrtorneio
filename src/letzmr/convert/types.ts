/** Item de texto com origem no topo da página (y cresce para baixo). */
export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

export type PdfPageText = {
  width: number;
  height: number;
  items: PdfTextItem[];
};

/** Recorte em coordenadas do topo da página-fonte. */
export type ClipRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type GroupClip = {
  pageIndex: number;
  label: string;
  /** Horário curto, ex. 14:30h, extraído da lista de jogos Letzplay. */
  when: string;
  titleClip: ClipRect;
  /** Linhas de jogadores na altura original, sem SIT/RANK nem o título GRUPO. */
  bodyClip: ClipRect;
  /** Células na altura original, para interpolar com o recorte justo. */
  cellClips: ClipRect[];
  /** Linhas recortadas bem justas, para 8+ grupos. */
  rowClips: ClipRect[];
};

export type CategoryPlan = {
  title: string;
  headerPageIndex: number;
  headerClip: ClipRect;
  sourceWidth: number;
  sourceHeight: number;
  groups: GroupClip[];
};

export type LetzplayAnalysis = {
  categories: CategoryPlan[];
  skippedPages: number[];
};

export type PlacedClipKind = "header" | "when" | "title" | "body" | "row";

export type PlacedClip = {
  pageIndex: number;
  clip?: ClipRect;
  dest: { x: number; y: number; width: number; height: number };
  kind: PlacedClipKind;
  text?: string;
};

export type OutputSheet = {
  title: string;
  compact: boolean;
  placements: PlacedClip[];
};
