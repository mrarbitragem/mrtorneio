import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  analyzeLetzplayPages,
  categoryShortName,
  extractGroupWhen,
  formatGroupClock,
  groupBlockHeight,
  groupsPdfFilename,
  layoutGroupSheets,
  splitSheetSizes,
  usesCompactLayout,
} from "./analyzeLetzplay";
import type { PdfPageText, PdfTextItem } from "./types";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures/letzplay-sample-pages.json");

function item(
  str: string,
  y: number,
  extra: Partial<PdfTextItem> = {},
): PdfTextItem {
  return {
    str,
    x: extra.x ?? 20,
    y,
    width: extra.width ?? 40,
    height: extra.height ?? extra.fontSize ?? 10,
    fontSize: extra.fontSize ?? 10,
  };
}

function groupPage(opts: {
  title: string;
  group: string;
  grupoY?: number;
  nRows?: number;
  when?: string;
}): PdfPageText {
  const grupoY = opts.grupoY ?? 97;
  const nRows = opts.nRows ?? 3;
  const theadY = grupoY + 27;
  const firstRowY = theadY + 25;
  const when = opts.when ?? "Sáb, 17/Out às 09:00hs";
  const items: PdfTextItem[] = [
    item(opts.title, 20, { x: 69, fontSize: 10.5, width: 400 }),
    item("Letzplay.me", 20, { x: 515, fontSize: 10.5 }),
    item("Federação", 34, { x: 69, fontSize: 7.5, height: 8 }),
    item("Beach Tennis", 57, { x: 69, fontSize: 8.2, height: 9 }),
    item(opts.group, grupoY, { x: 20, fontSize: 10 }),
    item("SIT.", theadY, { x: 40, fontSize: 7.5 }),
    item("JOGADORES", theadY, { x: 106, fontSize: 7.5 }),
    item("JOGOS", theadY, { x: 310, fontSize: 7.5 }),
    item("CLASSIF.", theadY, { x: 530, fontSize: 7.5 }),
  ];
  for (let i = 0; i < nRows; i += 1) {
    const y = firstRowY + i * 36;
    items.push(item(String(i + 1), y + 6, { x: 23, fontSize: 7.5, height: 8 }));
    items.push(item("0001", y, { x: 73, fontSize: 7.5, height: 8 }));
    items.push(item("JOÃO SILVA", y, { x: 106, fontSize: 8, height: 10 }));
    items.push(item("PEDRO SOUZA", y + 10, { x: 106, fontSize: 8, height: 10 }));
  }
  const jogosY = firstRowY + nRows * 36 + 20;
  items.push(item("JOGOS", jogosY, { x: 20, fontSize: 10 }));
  items.push(item("DATA/HORA", jogosY + 27, { x: 24, fontSize: 7.5 }));
  items.push(item("1", jogosY + 50, { x: 23, fontSize: 7.5, height: 8 }));
  items.push(item(when, jogosY + 45, { x: 40, fontSize: 7.5, height: 8 }));
  return { width: 595, height: 842, items };
}

function bracketPage(title: string): PdfPageText {
  return {
    width: 595,
    height: 842,
    items: [
      item(title, 20, { x: 69, fontSize: 10.5, width: 400 }),
      item("CAMPEÃO", 400, { x: 280, fontSize: 10 }),
      item("FINAL", 360, { x: 40, fontSize: 9 }),
    ],
  };
}

describe("analyzeLetzplayPages", () => {
  it("empilha grupos da mesma categoria e ignora jogos e chave", () => {
    const titleB = "CIRCUITO FBT - Dupla Masculina B";
    const titleC = "CIRCUITO FBT - Dupla Feminina C";
    const pages = [
      groupPage({ title: titleB, group: "GRUPO 1" }),
      groupPage({ title: titleB, group: "GRUPO 2", grupoY: 91 }),
      bracketPage(titleB),
      groupPage({ title: titleC, group: "GRUPO 1" }),
    ];
    const analysis = analyzeLetzplayPages(pages);
    expect(analysis.skippedPages).toEqual([2]);
    expect(analysis.categories).toHaveLength(2);
    expect(analysis.categories[0].groups.map((g) => g.label)).toEqual(["GRUPO 1", "GRUPO 2"]);
    expect(categoryShortName(analysis.categories[1].title)).toBe("Dupla Feminina C");
    const g1 = analysis.categories[0].groups[0];
    expect(g1.when).toBe("09:00h");
    expect(g1.rowClips).toHaveLength(3);
    expect(g1.cellClips).toHaveLength(3);
    expect(g1.cellClips[0].bottom - g1.cellClips[0].top).toBeGreaterThan(
      g1.rowClips[0].bottom - g1.rowClips[0].top,
    );
    expect(g1.bodyClip.top).toBeGreaterThan(120);
    expect(g1.bodyClip.top).toBeLessThan(g1.titleClip.bottom + 30);
    expect(g1.bodyClip.bottom).toBeGreaterThan(190);
    expect(g1.bodyClip.bottom).toBeLessThan(278);
  });

  it("lê o horário na seção de jogos, não na coluna JOGOS da tabela", () => {
    const page = groupPage({ title: "Torneio - Dupla A", group: "GRUPO 1", when: "Dom, 18/Out às 14:30hs" });
    expect(extractGroupWhen(page, page.items.find((i) => i.str === "JOGOS" && i.fontSize >= 10))).toBe(
      "Dom, 18/Out às 14:30hs",
    );
    expect(formatGroupClock("Sáb, 07/Nov às 14:30hs")).toBe("14:30h");
  });
});

describe("layoutGroupSheets", () => {
  it("com 4 a 7 grupos omite o SIT e põe o horário à direita do GRUPO", () => {
    const title = "Circuito - Masculina B";
    const pages = Array.from({ length: 4 }, (_, i) => groupPage({ title, group: `GRUPO ${i + 1}` }));
    const analysis = analyzeLetzplayPages(pages);
    expect(usesCompactLayout(analysis.categories[0].groups.length)).toBe(false);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].compact).toBe(false);
    expect(sheets[0].placements.some((p) => p.kind === "body")).toBe(true);
    expect(sheets[0].placements.some((p) => p.kind === "row")).toBe(false);
    const titles = sheets[0].placements.filter((p) => p.kind === "title");
    const whens = sheets[0].placements.filter((p) => p.kind === "when");
    expect(whens).toHaveLength(4);
    expect(whens[0]?.text).toBe("09:00h");
    expect(whens[0]?.dest.x).toBeGreaterThan(100);
    expect(Math.abs((whens[0]?.dest.y ?? 0) - (titles[0]?.dest.y ?? 0))).toBeLessThan(8);
    expect(titles[0]?.dest.y).toBeLessThan(80);
    expect((titles[1]?.dest.y ?? 0) - (titles[0]?.dest.y ?? 0)).toBeLessThan(160);
    const last = sheets[0].placements[sheets[0].placements.length - 1];
    expect(last.dest.y + last.dest.height).toBeLessThan(842 - 10);
  });

  it("com 3 grupos mantém o bloco no topo", () => {
    const title = "Circuito - Feminina B";
    const pages = Array.from({ length: 3 }, (_, i) => groupPage({ title, group: `GRUPO ${i + 1}` }));
    const analysis = analyzeLetzplayPages(pages);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(1);
    const titles = sheets[0].placements.filter((p) => p.kind === "title");
    expect(titles[0]?.dest.y).toBeLessThan(80);
    const last = sheets[0].placements[sheets[0].placements.length - 1];
    expect(last.dest.y + last.dest.height).toBeLessThan(650);
  });

  it("com 5 grupos cabe numa folha, sem SIT, com 14:30h à direita", () => {
    const title = "Circuito Goiano 2026 - 6ª Etapa - Feminina A";
    const pages = [
      ...Array.from({ length: 4 }, (_, i) =>
        groupPage({ title, group: `GRUPO ${i + 1}`, when: "Sáb, 07/Nov às 14:30hs" }),
      ),
      groupPage({ title, group: "GRUPO 5", nRows: 4, when: "Sáb, 07/Nov às 14:00hs" }),
    ];
    const analysis = analyzeLetzplayPages(pages);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].compact).toBe(false);
    expect(sheets[0].placements.filter((p) => p.kind === "body")).toHaveLength(5);
    expect(sheets[0].placements.filter((p) => p.kind === "when").map((p) => p.text)).toEqual([
      "14:30h",
      "14:30h",
      "14:30h",
      "14:30h",
      "14:00h",
    ]);
    const last = sheets[0].placements[sheets[0].placements.length - 1];
    expect(last.dest.y + last.dest.height).toBeGreaterThan(750);
    expect(last.dest.y + last.dest.height).toBeLessThan(842 - 10);
    const g1Title = sheets[0].placements.find((p) => p.kind === "title");
    expect(g1Title?.dest.y).toBeLessThan(80);
  });

  it("com 8 grupos compacta numa folha sem reduzir a fonte", () => {
    const title = "Circuito Goiano 2026 - 6ª Etapa - Masculina A";
    const pages = [
      ...Array.from({ length: 7 }, (_, i) => groupPage({ title, group: `GRUPO ${i + 1}` })),
      groupPage({ title, group: "GRUPO 8", nRows: 4 }),
    ];
    const analysis = analyzeLetzplayPages(pages);
    expect(usesCompactLayout(8)).toBe(true);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].compact).toBe(true);
    expect(sheets[0].placements.some((p) => p.kind === "row")).toBe(true);
    expect(sheets[0].placements.some((p) => p.kind === "table")).toBe(false);
    expect(sheets[0].placements.find((p) => p.kind === "title")?.dest.y).toBeLessThan(80);
    const last = sheets[0].placements[sheets[0].placements.length - 1];
    expect(last.dest.y + last.dest.height).toBeLessThan(842 - 10);
  });

  it("com 6 grupos aperta as linhas menos do que com 8", () => {
    const title6 = "Circuito - Seis grupos";
    const title8 = "Circuito - Oito grupos";
    const pages6 = Array.from({ length: 6 }, (_, i) => groupPage({ title: title6, group: `GRUPO ${i + 1}` }));
    const pages8 = [
      ...Array.from({ length: 7 }, (_, i) => groupPage({ title: title8, group: `GRUPO ${i + 1}` })),
      groupPage({ title: title8, group: "GRUPO 8", nRows: 4 }),
    ];
    const pageSize = { width: 595, height: 842 };
    const six = layoutGroupSheets(analyzeLetzplayPages(pages6).categories, pageSize)[0];
    const eight = layoutGroupSheets(analyzeLetzplayPages(pages8).categories, pageSize)[0];
    const avg = (sheet: (typeof six)) => {
      const rows = sheet.placements.filter((p) => p.kind === "row" || p.kind === "body");
      return rows.reduce((sum, p) => sum + p.dest.height, 0) / rows.length;
    };
    expect(avg(six)).toBeGreaterThan(avg(eight));
    expect(six.placements.find((p) => p.kind === "title")?.dest.y).toBeLessThan(80);
  });

  it("com 9 grupos divide em duas folhas 5 e 4", () => {
    const title = "Circuito - Categoria Cheia";
    const pages = Array.from({ length: 9 }, (_, i) => groupPage({ title, group: `GRUPO ${i + 1}` }));
    const analysis = analyzeLetzplayPages(pages);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(2);
    expect(sheets[0].placements.filter((p) => p.kind === "title")).toHaveLength(5);
    expect(sheets[1].placements.filter((p) => p.kind === "title")).toHaveLength(4);
    expect(sheets[0].compact).toBe(false);
    expect(sheets[1].compact).toBe(false);
    expect(sheets[1].placements[0].kind).toBe("header");
  });

  it("com 11 grupos divide em duas folhas 6 e 5", () => {
    const title = "Circuito - Categoria 11";
    const pages = Array.from({ length: 11 }, (_, i) => groupPage({ title, group: `GRUPO ${i + 1}` }));
    const analysis = analyzeLetzplayPages(pages);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(2);
    expect(sheets[0].placements.filter((p) => p.kind === "title")).toHaveLength(6);
    expect(sheets[1].placements.filter((p) => p.kind === "title")).toHaveLength(5);
  });

  it("com 16 grupos divide em duas folhas de 8", () => {
    const title = "CIRCUITO FBT - Dupla Cheia";
    const pages = Array.from({ length: 16 }, (_, i) =>
      groupPage({ title, group: `GRUPO ${i + 1}`, nRows: 4 }),
    );
    const analysis = analyzeLetzplayPages(pages);
    const sheets = layoutGroupSheets(analysis.categories, { width: 595, height: 842 });
    expect(sheets).toHaveLength(2);
    expect(sheets[0].placements.filter((p) => p.kind === "title")).toHaveLength(8);
    expect(sheets[1].placements.filter((p) => p.kind === "title")).toHaveLength(8);
    expect(sheets[0].compact).toBe(true);
    expect(sheets[1].compact).toBe(true);
    expect(sheets[1].placements[0].kind).toBe("header");
  });
});

describe("splitSheetSizes", () => {
  it("reparte até 8 numa folha e equilibra o restante", () => {
    expect(splitSheetSizes(1)).toEqual([1]);
    expect(splitSheetSizes(8)).toEqual([8]);
    expect(splitSheetSizes(9)).toEqual([5, 4]);
    expect(splitSheetSizes(10)).toEqual([5, 5]);
    expect(splitSheetSizes(11)).toEqual([6, 5]);
    expect(splitSheetSizes(16)).toEqual([8, 8]);
    expect(splitSheetSizes(17)).toEqual([6, 6, 5]);
  });
});

describe("nomes do conversor", () => {
  it("deriva o arquivo de grupos e o nome curto da categoria", () => {
    expect(groupsPdfFilename("mb_fc_mc_ma_fa_FB_merged.pdf")).toBe("mb_fc_mc_ma_fa_FB_merged-grupos.pdf");
    expect(groupsPdfFilename("folha-grupos.pdf")).toBe("folha-grupos.pdf");
    expect(categoryShortName("CIRCUITO BRASILIENSE DE BEACH TENNIS - FBT 1000 LIFE - Dupla Masculina B")).toBe(
      "Dupla Masculina B",
    );
  });
});

describe("PDF Letzplay de exemplo", () => {
  it("acha 6 categorias e 18 grupos, pulando as folhas de chave", () => {
    const sample = JSON.parse(readFileSync(fixturePath, "utf8")) as { pages: PdfPageText[] };
    const analysis = analyzeLetzplayPages(sample.pages);
    expect(analysis.skippedPages).toEqual([4, 7, 10, 13, 19, 23]);
    expect(analysis.categories.map((c) => c.groups.length)).toEqual([4, 2, 2, 2, 5, 3]);
    expect(analysis.categories[0].groups[0].when).toMatch(/09:00h/);
    expect(usesCompactLayout(analysis.categories[0].groups.length)).toBe(false);
    expect(usesCompactLayout(analysis.categories[4].groups.length)).toBe(false);
    const sheets = layoutGroupSheets(analysis.categories, {
      width: sample.pages[0].width,
      height: sample.pages[0].height,
    });
    expect(sheets).toHaveLength(6);
    expect(sheets.every((sheet) => sheet.compact === false)).toBe(true);
    expect(sheets[0].placements.some((p) => p.kind === "body")).toBe(true);
    expect(sheets[0].placements.some((p) => p.kind === "when")).toBe(true);
    expect(sheets[4].placements.filter((p) => p.kind === "body")).toHaveLength(5);
    expect(
      groupBlockHeight(
        analysis.categories[0].groups[0],
        analysis.categories[0].sourceWidth,
        sample.pages[0].width,
        false,
      ),
    ).toBeGreaterThan(110);
  });
});
