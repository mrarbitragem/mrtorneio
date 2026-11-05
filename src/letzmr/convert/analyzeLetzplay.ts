import type {
  CategoryPlan,
  ClipRect,
  GroupClip,
  LetzplayAnalysis,
  OutputSheet,
  PdfPageText,
  PdfTextItem,
  PlacedClip,
} from "./types";

/** Máximo de grupos por folha. Acima disso, divide o mais equilibrado possível. */
export const MAX_GROUPS_PER_SHEET = 8;
/** A partir deste número a folha aperta as linhas; com menos, altura original sem SIT. */
export const COMPACT_MIN_GROUPS = MAX_GROUPS_PER_SHEET;

export const HEADER_LINE_PAD = 4;
export const PAGE_BOTTOM_MARGIN = 14;

const COMPACT = {
  headerGap: 2,
  groupGap: 3,
  titleToRows: 0,
  timeHeight: 8,
  rowPadTop: 1,
  rowPadBottom: 1.5,
  titlePadTop: 1,
  titlePadBottom: 3,
};

const COMFORTABLE = {
  headerGap: 2,
  groupGap: 6,
  titleToBody: 2,
  timeHeight: 9,
  bodyTopFromThead: 16.5,
  bodyBottomPad: 8,
};

const GRUPO_HEADING = /^grupo\s+\S+$/i;
const TIME_IN_LINE = /\d{1,2}:\d{2}\s*hs?/i;

function normalize(str: string): string {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function isGrupoHeading(item: PdfTextItem): boolean {
  return item.fontSize >= 9 && item.x < 160 && GRUPO_HEADING.test(normalize(item.str));
}

function isJogosSectionHeading(item: PdfTextItem): boolean {
  return item.fontSize >= 9 && item.x < 120 && normalize(item.str).toUpperCase() === "JOGOS";
}

function hasRankingTable(items: PdfTextItem[]): boolean {
  return items.some((item) => {
    const text = normalize(item.str).toUpperCase();
    return text === "JOGADORES" || text === "CLASSIF." || text === "CLASSIF";
  });
}

function looksLikeBracket(items: PdfTextItem[]): boolean {
  const hasChampion = items.some((item) => /campe[aã]o/i.test(item.str));
  return hasChampion && !items.some(isGrupoHeading);
}

function pageTitle(items: PdfTextItem[]): string {
  const line = items
    .filter((item) => item.y < 36 && item.fontSize >= 9.5 && item.x < 500)
    .sort((a, b) => a.x - b.x);
  return normalize(line.map((item) => item.str).join(" "));
}

function firstGrupoHeading(items: PdfTextItem[]): PdfTextItem | undefined {
  const found = items.filter(isGrupoHeading);
  if (!found.length) return undefined;
  return found.reduce((best, item) => (item.y < best.y ? item : best));
}

function jogosSectionHeading(items: PdfTextItem[]): PdfTextItem | undefined {
  const found = items.filter(isJogosSectionHeading);
  if (!found.length) return undefined;
  return found.reduce((best, item) => (item.y < best.y ? item : best));
}

function clipRect(left: number, top: number, right: number, bottom: number): ClipRect {
  return { left, top, right, bottom };
}

function groupNumber(label: string): number {
  const match = normalize(label).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function usesCompactLayout(groupCount: number): boolean {
  return groupCount >= COMPACT_MIN_GROUPS;
}

/**
 * Quantos grupos vão em cada folha: no máximo 8, o mais equilibrado possível.
 * 8 → [8], 9 → [5, 4], 11 → [6, 5], 16 → [8, 8], 17 → [6, 6, 5].
 */
export function splitSheetSizes(groupCount: number, maxPerSheet = MAX_GROUPS_PER_SHEET): number[] {
  const n = Math.max(0, Math.floor(groupCount));
  if (n <= 0) return [];
  if (n <= maxPerSheet) return [n];
  const sheetCount = Math.ceil(n / maxPerSheet);
  const base = Math.floor(n / sheetCount);
  const extra = n % sheetCount;
  return Array.from({ length: sheetCount }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Pega o horário (e variações) da seção JOGOS da folha Letzplay. */
export function extractGroupWhen(page: PdfPageText, jogos?: PdfTextItem): string {
  if (!jogos) return "";
  const lines = page.items
    .filter((item) => item.y > jogos.y && item.x < 180 && TIME_IN_LINE.test(item.str))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((item) => normalize(item.str));
  return [...new Set(lines)].join(" / ");
}

/** "Sáb, 07/Nov às 14:30hs" → "14:30h" */
export function formatGroupClock(raw: string): string {
  const clocks = [...String(raw || "").matchAll(/(\d{1,2}):(\d{2})/g)].map(
    (match) => `${match[1].padStart(2, "0")}:${match[2]}h`,
  );
  return [...new Set(clocks)].join(" / ");
}

function theadY(page: PdfPageText, grupo: PdfTextItem, tableEnd: number): number | undefined {
  const heading = page.items.find((item) => {
    const text = normalize(item.str).toUpperCase();
    return (
      item.y > grupo.y &&
      item.y < tableEnd &&
      item.fontSize < 9.5 &&
      (text === "JOGADORES" || text === "SIT." || text === "SIT")
    );
  });
  return heading?.y;
}

function uniqueByY(items: PdfTextItem[], gap = 5): PdfTextItem[] {
  const out: PdfTextItem[] = [];
  for (const item of items) {
    if (!out.some((prev) => Math.abs(prev.y - item.y) < gap)) out.push(item);
  }
  return out;
}

function rowMarkers(page: PdfPageText, afterY: number, tableEnd: number): PdfTextItem[] {
  const markers = page.items
    .filter(
      (item) =>
        item.x < 50 &&
        item.y >= afterY &&
        item.y < tableEnd &&
        item.fontSize < 9.5 &&
        /^\d{1,2}$/.test(normalize(item.str)),
    )
    .sort((a, b) => a.y - b.y);
  return uniqueByY(markers);
}

function tightBand(items: PdfTextItem[], fallbackTop: number, fallbackBottom: number, page: PdfPageText): ClipRect {
  const top = items.length ? Math.min(...items.map((item) => item.y)) : fallbackTop;
  const bottom = items.length
    ? Math.max(...items.map((item) => item.y + item.height))
    : fallbackBottom;
  return clipRect(
    0,
    Math.max(0, top - COMPACT.rowPadTop),
    page.width,
    Math.min(page.height, Math.max(top + 8, bottom + COMPACT.rowPadBottom)),
  );
}

function bodyClipForPage(
  page: PdfPageText,
  grupo: PdfTextItem,
  afterThead: number,
  tableEnd: number,
  jogos?: PdfTextItem,
): ClipRect {
  let lastBottom = afterThead;
  for (const item of page.items) {
    if (item.y >= afterThead && item.y < tableEnd) {
      lastBottom = Math.max(lastBottom, item.y + item.height);
    }
  }
  const fallback = jogos?.y ?? grupo.y + 80;
  let bottom = Math.min(page.height, (lastBottom || fallback) + COMFORTABLE.bodyBottomPad);
  if (jogos) bottom = Math.min(bottom, jogos.y - 6);
  const top = Math.max(0, afterThead - 2);
  return clipRect(0, top, page.width, Math.max(top + 16, bottom));
}

function groupClipsForPage(page: PdfPageText, grupo: PdfTextItem, jogos?: PdfTextItem): GroupClip {
  const tableEnd = jogos ? jogos.y - 2 : page.height;
  const headerRowY = theadY(page, grupo, tableEnd);
  const afterThead =
    headerRowY != null ? headerRowY + COMFORTABLE.bodyTopFromThead : grupo.y + grupo.height + 8;
  const markers = rowMarkers(page, afterThead, tableEnd);

  const titleBottom = Math.min(
    grupo.y + grupo.height + COMPACT.titlePadBottom,
    headerRowY != null ? headerRowY - 2 : afterThead,
  );
  const titleClip = clipRect(
    0,
    Math.max(0, grupo.y - COMPACT.titlePadTop),
    page.width,
    Math.max(grupo.y + 8, titleBottom),
  );

  const bodyClip = bodyClipForPage(page, grupo, afterThead, tableEnd, jogos);
  let rowClips: ClipRect[];
  let cellClips: ClipRect[];
  if (markers.length) {
    rowClips = [];
    cellClips = [];
    markers.forEach((marker, idx) => {
      const prev = markers[idx - 1];
      const next = markers[idx + 1];
      const bandTop = prev ? (prev.y + marker.y) / 2 : bodyClip.top;
      const bandBot = next ? (marker.y + next.y) / 2 : bodyClip.bottom;
      const inBand = page.items.filter(
        (item) => item.y >= bandTop && item.y < bandBot && (jogos == null || item.y < jogos.y - 1),
      );
      cellClips.push(clipRect(0, bandTop, page.width, Math.max(bandTop + 8, bandBot)));
      rowClips.push(tightBand(inBand, marker.y, marker.y + marker.height, page));
    });
  } else {
    const bodyItems = page.items.filter(
      (item) => item.y >= afterThead && item.y < tableEnd && item.y > grupo.y,
    );
    rowClips = bodyItems.length ? [tightBand(bodyItems, afterThead, tableEnd, page)] : [];
    cellClips = [bodyClip];
  }

  return {
    pageIndex: 0,
    label: normalize(grupo.str).toUpperCase(),
    when: formatGroupClock(extractGroupWhen(page, jogos)),
    titleClip,
    bodyClip,
    cellClips,
    rowClips,
  };
}

function headerClipFor(page: PdfPageText, grupo: PdfTextItem): ClipRect {
  const headerItems = page.items.filter((item) => item.y + item.height < grupo.y - 8 && item.y < 72);
  const contentBottom = headerItems.length
    ? Math.max(...headerItems.map((item) => item.y + item.height))
    : 66;
  const bottom = Math.min(grupo.y - 6, contentBottom + HEADER_LINE_PAD);
  return clipRect(0, 0, page.width, Math.max(64, bottom));
}

/**
 * Lê a impressão Letzplay (um grupo + jogos por folha) e monta recortes
 * só das tabelas de classificação, agrupadas por categoria.
 */
export function analyzeLetzplayPages(pages: PdfPageText[]): LetzplayAnalysis {
  const categories: CategoryPlan[] = [];
  const skippedPages: number[] = [];
  const byTitle = new Map<string, CategoryPlan>();

  pages.forEach((page, pageIndex) => {
    const grupo = firstGrupoHeading(page.items);
    if (looksLikeBracket(page.items) || !grupo || !hasRankingTable(page.items)) {
      skippedPages.push(pageIndex);
      return;
    }
    const title = pageTitle(page.items) || `Página ${pageIndex + 1}`;
    const jogos = jogosSectionHeading(page.items);
    const group = groupClipsForPage(page, grupo, jogos);
    group.pageIndex = pageIndex;
    let category = byTitle.get(title);
    if (!category) {
      category = {
        title,
        headerPageIndex: pageIndex,
        headerClip: headerClipFor(page, grupo),
        sourceWidth: page.width,
        sourceHeight: page.height,
        groups: [],
      };
      byTitle.set(title, category);
      categories.push(category);
    }
    category.groups.push(group);
  });

  for (const category of categories) {
    category.groups.sort(
      (a, b) => groupNumber(a.label) - groupNumber(b.label) || a.pageIndex - b.pageIndex,
    );
  }

  return { categories, skippedPages };
}

export function categoryShortName(title: string): string {
  const parts = String(title || "")
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || title;
}

export function groupsPdfFilename(originalName: string): string {
  const base = String(originalName || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop() || "grupos.pdf";
  const stem = base.replace(/\.pdf$/i, "");
  if (!stem) return "grupos.pdf";
  if (/-grupos$/i.test(stem)) return `${stem}.pdf`;
  return `${stem}-grupos.pdf`;
}

function scaleY(height: number, sourceWidth: number, pageWidth: number): number {
  return height * (pageWidth / sourceWidth);
}

function clipHeight(clip: ClipRect): number {
  return Math.max(0, clip.bottom - clip.top);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpClip(tight: ClipRect, full: ClipRect, t: number): ClipRect {
  const k = Math.min(1, Math.max(0, t));
  return clipRect(
    full.left,
    tight.top + k * (full.top - tight.top),
    full.right,
    tight.bottom + k * (full.bottom - tight.bottom),
  );
}

function densityRowClips(group: GroupClip, density: number): ClipRect[] {
  const count = Math.min(group.rowClips.length, group.cellClips.length);
  return Array.from({ length: count }, (_, i) => lerpClip(group.rowClips[i], group.cellClips[i], density));
}

function groupHeightAtDensity(
  group: GroupClip,
  sourceWidth: number,
  pageWidth: number,
  density: number,
): number {
  const titleH = scaleY(clipHeight(group.titleClip), sourceWidth, pageWidth);
  if (density >= 1) {
    return titleH + COMFORTABLE.titleToBody + scaleY(clipHeight(group.bodyClip), sourceWidth, pageWidth);
  }
  const titlePad = lerp(COMPACT.titleToRows, COMFORTABLE.titleToBody, density);
  const rowsH = densityRowClips(group, density).reduce(
    (sum, clip) => sum + scaleY(clipHeight(clip), sourceWidth, pageWidth),
    0,
  );
  return titleH + titlePad + rowsH;
}

export function groupBlockHeight(
  group: GroupClip,
  sourceWidth: number,
  pageWidth: number,
  compact: boolean,
): number {
  return groupHeightAtDensity(group, sourceWidth, pageWidth, compact ? 0 : 1);
}

function placeClip(
  pageIndex: number,
  clip: ClipRect,
  y: number,
  pageWidth: number,
  sourceWidth: number,
  kind: PlacedClip["kind"],
): { placed: PlacedClip; nextY: number } {
  const height = scaleY(clipHeight(clip), sourceWidth, pageWidth);
  return {
    placed: {
      pageIndex,
      clip,
      dest: { x: 0, y, width: pageWidth, height },
      kind,
    },
    nextY: y + height,
  };
}

function placeWhenBesideTitle(
  group: GroupClip,
  titleY: number,
  titleHeight: number,
  pageWidth: number,
  timeHeight: number,
): PlacedClip | null {
  if (!group.when) return null;
  const width = 240;
  return {
    pageIndex: group.pageIndex,
    dest: {
      x: Math.max(200, pageWidth - width - 22),
      y: titleY + Math.max(0, (titleHeight - timeHeight) / 2),
      width,
      height: timeHeight,
    },
    kind: "when",
    text: group.when,
  };
}

function placeGroupTitle(
  group: GroupClip,
  y: number,
  pageWidth: number,
  sourceWidth: number,
  timeHeight: number,
): { placements: PlacedClip[]; nextY: number } {
  const title = placeClip(group.pageIndex, group.titleClip, y, pageWidth, sourceWidth, "title");
  const beside = placeWhenBesideTitle(
    group,
    title.placed.dest.y,
    title.placed.dest.height,
    pageWidth,
    timeHeight,
  );
  return {
    placements: beside ? [title.placed, beside] : [title.placed],
    nextY: title.nextY,
  };
}

function sheetStackHeight(
  groups: GroupClip[],
  sourceWidth: number,
  pageWidth: number,
  headerH: number,
  density: number,
): number {
  const headerGap = lerp(COMPACT.headerGap, COMFORTABLE.headerGap, density);
  const groupGap = lerp(COMPACT.groupGap, COMFORTABLE.groupGap, density);
  let height = headerH + headerGap;
  groups.forEach((group, index) => {
    height += groupHeightAtDensity(group, sourceWidth, pageWidth, density);
    if (index < groups.length - 1) height += groupGap;
  });
  return height;
}

/** 1 = linhas originais; 0 = recorte justo. Só aperta o bastante para caber na folha. */
export function sheetDensity(
  groups: GroupClip[],
  sourceWidth: number,
  pageSize: { width: number; height: number },
  headerH: number,
): number {
  const room = pageSize.height - PAGE_BOTTOM_MARGIN;
  const full = sheetStackHeight(groups, sourceWidth, pageSize.width, headerH, 1);
  if (full <= room) return 1;
  const tight = sheetStackHeight(groups, sourceWidth, pageSize.width, headerH, 0);
  if (tight >= room || full <= tight) return 0;
  return (room - tight) / (full - tight);
}

function placeGroupsOnSheet(
  sheet: OutputSheet,
  groups: GroupClip[],
  sourceWidth: number,
  pageSize: { width: number; height: number },
  headerH: number,
  density: number,
) {
  const headerGap = lerp(COMPACT.headerGap, COMFORTABLE.headerGap, density);
  const groupGap = lerp(COMPACT.groupGap, COMFORTABLE.groupGap, density);
  const titlePad = lerp(COMPACT.titleToRows, COMFORTABLE.titleToBody, density);
  const timeHeight = lerp(COMPACT.timeHeight, COMFORTABLE.timeHeight, density);
  let y = headerH + headerGap;
  for (const group of groups) {
    const heading = placeGroupTitle(group, y, pageSize.width, sourceWidth, timeHeight);
    sheet.placements.push(...heading.placements);
    y = heading.nextY;
    if (density >= 1) {
      y += COMFORTABLE.titleToBody;
      const body = placeClip(group.pageIndex, group.bodyClip, y, pageSize.width, sourceWidth, "body");
      sheet.placements.push(body.placed);
      y = body.nextY;
    } else {
      y += titlePad;
      densityRowClips(group, density).forEach((clip) => {
        const row = placeClip(group.pageIndex, clip, y, pageSize.width, sourceWidth, "row");
        sheet.placements.push(row.placed);
        y = row.nextY;
      });
    }
    y += groupGap;
  }
}

/**
 * Empilha os grupos em folhas A4, sempre junto ao cabeçalho.
 * Até 8 grupos ficam numa folha; acima disso divide equilibrado (9→5+4, 11→6+5).
 * Sempre omite SIT/RANK e põe o horário à direita do GRUPO.
 * A tabela só aperta o bastante para caber: 5 grupos diminuem menos que 8.
 */
export function layoutGroupSheets(
  categories: CategoryPlan[],
  pageSize: { width: number; height: number },
): OutputSheet[] {
  const sheets: OutputSheet[] = [];

  for (const category of categories) {
    const headerH = scaleY(clipHeight(category.headerClip), category.sourceWidth, pageSize.width);
    const sizes = splitSheetSizes(category.groups.length);
    let offset = 0;
    for (const size of sizes) {
      const chunk = category.groups.slice(offset, offset + size);
      offset += size;
      const density = sheetDensity(chunk, category.sourceWidth, pageSize, headerH);
      const sheet: OutputSheet = {
        title: category.title,
        compact: density < 0.5,
        placements: [
          {
            pageIndex: category.headerPageIndex,
            clip: category.headerClip,
            dest: { x: 0, y: 0, width: pageSize.width, height: headerH },
            kind: "header",
          },
        ],
      };
      placeGroupsOnSheet(sheet, chunk, category.sourceWidth, pageSize, headerH, density);
      sheets.push(sheet);
    }
  }

  return sheets;
}
