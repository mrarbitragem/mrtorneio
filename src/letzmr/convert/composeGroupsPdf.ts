import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { copyPdfBytes } from "./pdfBytes";
import type { ClipRect, OutputSheet, PlacedClip } from "./types";

const TABLE_INSET_LEFT = 20.25;
const TABLE_INSET_RIGHT = 19.7;
const GRID = rgb(0.8, 0.8, 0.8);
const WHEN_COLOR = rgb(0.25, 0.25, 0.25);

function pdfBox(clip: ClipRect, pageWidth: number, pageHeight: number) {
  const left = Math.max(0, clip.left);
  const right = Math.min(pageWidth, clip.right);
  const top = Math.min(pageHeight, pageHeight - clip.top);
  const bottom = Math.max(0, pageHeight - clip.bottom);
  if (right - left < 2 || top - bottom < 2) return null;
  return { left, bottom, right, top };
}

function drawHLine(
  page: {
    drawLine: (opts: {
      start: { x: number; y: number };
      end: { x: number; y: number };
      thickness: number;
      color: ReturnType<typeof rgb>;
    }) => void;
  },
  y: number,
  pageWidth: number,
) {
  page.drawLine({
    start: { x: TABLE_INSET_LEFT, y },
    end: { x: Math.max(TABLE_INSET_LEFT + 40, pageWidth - TABLE_INSET_RIGHT), y },
    thickness: 0.6,
    color: GRID,
  });
}

function winAnsiSafe(text: string): string {
  return text
    .replace(/–|—/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

/** Recorta cabeçalho + tabelas da origem e empilha nas folhas de saída. */
export async function composeGroupsPdf(
  sourceBytes: ArrayBuffer | Uint8Array,
  sheets: OutputSheet[],
  pageSize: { width: number; height: number },
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(copyPdfBytes(sourceBytes), { ignoreEncryption: true });
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const firstTitle = sheets[0]?.title;
  if (firstTitle) outDoc.setTitle(`${firstTitle.split(" - ")[0]?.trim() || firstTitle} — grupos`);
  outDoc.setProducer("MRTorneio");

  for (const sheet of sheets) {
    const page = outDoc.addPage([pageSize.width, pageSize.height]);
    const timeSize = sheet.compact ? 7.5 : 9;
    for (const placed of sheet.placements) {
      if (placed.kind === "when" && placed.text) {
        const baseline = pageSize.height - placed.dest.y - placed.dest.height + 1.5;
        const label = winAnsiSafe(placed.text);
        const draw = (value: string) => {
          const width = font.widthOfTextAtSize(value, timeSize);
          const x =
            placed.dest.x > 100
              ? placed.dest.x + placed.dest.width - width
              : placed.dest.x;
          page.drawText(value, {
            x,
            y: baseline,
            size: timeSize,
            font,
            color: WHEN_COLOR,
          });
        };
        try {
          draw(label);
        } catch {
          draw(label.normalize("NFD").replace(/\p{M}/gu, ""));
        }
        continue;
      }
      if (!placed.clip) continue;
      const srcPage = srcDoc.getPage(placed.pageIndex);
      if (!srcPage) continue;
      const box = pdfBox(placed.clip, srcPage.getWidth(), srcPage.getHeight());
      if (!box) continue;
      const embedded = await outDoc.embedPage(srcPage, box);
      page.drawPage(embedded, {
        x: placed.dest.x,
        y: pageSize.height - placed.dest.y - placed.dest.height,
        width: placed.dest.width,
        height: placed.dest.height,
      });
    }
    sheet.placements.forEach((placed, index) => {
      if (placed.kind !== "row") return;
      const next = sheet.placements[index + 1];
      const lastOfGroup = !next || next.kind !== "row";
      const top = page.getHeight() - placed.dest.y;
      const bottom = page.getHeight() - placed.dest.y - placed.dest.height;
      drawHLine(page, top, pageSize.width);
      if (lastOfGroup) drawHLine(page, bottom, pageSize.width);
    });
  }

  return outDoc.save();
}
