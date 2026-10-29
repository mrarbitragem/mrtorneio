/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 3151-3164 e 7310-7842.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 3151-3164 ----
function getTournamentPrintLogo() {
  return state.meta?.tournamentPrintLogo || RCP_PRINT_LOGO_DATA_URI;
}

function getTournamentPrintLogoAlt() {
  return state.meta?.tournamentPrintLogo
    ? (state.meta?.tournamentName ? `Logo ${state.meta.tournamentName}` : 'Logo do torneio')
    : 'RCP Manager';
}

function renderPrintHeaderSide(label, printedAt='') {
  return `<div class="print-header-side"><div class="print-badge">${escapeHtml(label)}</div><img class="brand-logo-print-secondary" src="${RCP_PRINT_LOGO_DATA_URI}" alt="RCP Manager">${printedAt ? `<div class="print-stamp">Impresso em ${escapeHtml(printedAt)}</div>` : ''}</div>`;
}


// ---- linhas 7310-7842 ----
  function printWindowDocument(title, bodyHtml, options = {}) {
    let win = null;
    try { win = window.open('about:blank', '_blank'); } catch (error) { win = null; }
    if (!win) {
      try {
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        frame.style.opacity = '0';
        frame.style.pointerEvents = 'none';
        document.body.appendChild(frame);
        win = frame.contentWindow;
        if (win) win.__printFrame = frame;
      } catch (error) {
        win = null;
      }
    }
    if (!win) {
      setStatus('Não foi possível abrir a visualização de impressão. Verifique se o navegador bloqueou pop-ups para este arquivo HTML.', 'error');
      return;
    }
    const orientation = options.landscape ? 'landscape' : 'portrait';
    // A lista diária usa margens econômicas próprias, sem mudar os outros impressos.
    const printMargin = options.bracketWide ? '5mm' : (options.compactGames ? '5mm 5mm 6mm' : '10mm');
    const safeBodyHtml = bodyHtml && bodyHtml.trim()
      ? bodyHtml
      : '<section class="sheet"><div class="empty-sheet">Sem conteúdo disponível para impressão.</div></section>';
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 ${orientation}; margin: ${printMargin}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111111; background: #d9dde3; }
  body.landscape .sheet { width: calc(297mm - 20mm); min-height: calc(210mm - 20mm); }
  body.portrait .sheet { width: calc(210mm - 20mm); min-height: calc(297mm - 20mm); }
  .screen-toolbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #111827;
    color: #ffffff;
    border-bottom: 1px solid #374151;
  }
  .screen-toolbar strong { font-size: 14px; }
  .screen-toolbar .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .screen-toolbar button {
    border: 1px solid #374151;
    background: #ffffff;
    color: #111827;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .screen-toolbar button.secondary {
    background: transparent;
    color: #ffffff;
  }
  .print-root { padding: 14px 0 28px; }
  .sheet {
    margin: 0 auto 16px;
    background: #ffffff;
    box-shadow: 0 2px 14px rgba(15, 23, 42, 0.12);
    padding: 10mm;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .sheet + .sheet { page-break-before: always; }
  .empty-sheet {
    border: 1px solid #111111;
    padding: 18px;
    font-size: 13px;
  }
  .print-header {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .print-header-main {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .print-header-main > div:last-child {
    min-width: 0;
    flex: 1;
  }
  .brand-logo-print {
    width: 11mm;
    max-width: 11mm;
    height: 11mm;
    max-height: 11mm;
    object-fit: contain;
    object-position: center;
    display: block;
    flex: 0 0 11mm;
  }
  .print-title {
    margin: 0;
    font-size: 20px;
    line-height: 1.1;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .print-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.35;
  }
  .print-badge {
    border: 1px solid #111111;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .print-header-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex: 0 0 auto;
  }
  .brand-logo-print-secondary {
    width: 15mm;
    max-width: 15mm;
    max-height: 6mm;
    height: auto;
    object-fit: contain;
    object-position: right center;
    display: block;
  }
  .print-stamp {
    font-size: 10px;
    line-height: 1.25;
    color: #333333;
    white-space: nowrap;
  }
  .meta-line {
    font-size: 11px;
    margin-top: 4px;
    color: #333333;
  }
  .section-title {
    font-size: 15px;
    font-weight: 700;
    margin: 12px 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .section-note {
    font-size: 11px;
    margin: 0 0 8px;
    color: #444444;
  }
  .criteria-box {
    border: 1px solid #111111;
    padding: 10px 12px;
    margin: 8px 0 12px;
    font-size: 12px;
    line-height: 1.45;
    background: #fafafa;
  }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  .print-table th,
  .print-table td {
    border: 1px solid #a3a3a3;
    padding: 7px 6px;
    font-size: 11px;
    line-height: 1.25;
    vertical-align: middle;
  }
  .print-table th {
    background: #f3f3f3;
    text-align: left;
    font-weight: 700;
    text-transform: uppercase;
  }
  .print-table td.num,
  .print-table th.num {
    text-align: center;
  }
  .print-table td.right,
  .print-table th.right {
    text-align: right;
  }
  .print-table.compact th,
  .print-table.compact td {
    padding-top: 6px;
    padding-bottom: 6px;
  }
  .groups-only-sheet { padding-top: 7mm; }
  .groups-only-stack {
    display: flex;
    flex-direction: column;
    gap: 3.2mm;
  }
  .groups-only-item {
    break-inside: avoid;
    page-break-inside: avoid;
    margin: 0;
  }
  .groups-only-item .section-title {
    margin-bottom: 4px;
  }
  .groups-only-table { margin-top: 0; }
  /* Duplas na impressão de grupos, nos dois formatos (completo e apenas grupos). */
  .print-groups-table { table-layout: fixed; }
  .print-groups-table th,
  .print-groups-table td {
    font-size: 9.5px;
    line-height: 1.15;
    padding: 3px 4px;
    vertical-align: middle;
    word-break: normal;
    overflow-wrap: anywhere;
  }
  .print-groups-table.compact th,
  .print-groups-table.compact td { padding-top: 3px; padding-bottom: 3px; }
  .print-groups-table th { font-size: 9px; }
  .print-groups-table .print-team-name {
    font-size: 10px;
    font-weight: 500;
    text-transform: none;
    line-height: 1.14;
  }
  .print-groups-table .print-team-name .team-person {
    display: block;
    width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
    text-transform: none;
  }
  .print-groups-table .print-team-name .team-person + .team-person { margin-top: 1px; }
  .print-groups-ranking th:nth-child(1), .print-groups-ranking td:nth-child(1) { width: 5%; }
  .print-groups-ranking th:nth-child(2), .print-groups-ranking td:nth-child(2) { width: 9%; }
  .print-groups-ranking th:nth-child(3), .print-groups-ranking td:nth-child(3) { width: 44%; }
  .print-groups-ranking th:nth-child(4), .print-groups-ranking td:nth-child(4) { width: 7%; }
  .print-groups-ranking th:nth-child(5), .print-groups-ranking td:nth-child(5) { width: 7%; }
  .print-groups-ranking th:nth-child(6), .print-groups-ranking td:nth-child(6) { width: 7%; }
  .print-groups-ranking th:nth-child(7), .print-groups-ranking td:nth-child(7) { width: 7%; }
  .print-groups-ranking th:nth-child(8), .print-groups-ranking td:nth-child(8) { width: 7%; }
  .print-groups-ranking th:nth-child(9), .print-groups-ranking td:nth-child(9) { width: 7%; }
  .print-groups-matches th:nth-child(1), .print-groups-matches td:nth-child(1) { width: 6%; }
  .print-groups-matches th:nth-child(2), .print-groups-matches td:nth-child(2) { width: 15%; }
  .print-groups-matches th:nth-child(3), .print-groups-matches td:nth-child(3) { width: 32%; }
  .print-groups-matches th:nth-child(4), .print-groups-matches td:nth-child(4) { width: 14%; }
  .print-groups-matches th:nth-child(5), .print-groups-matches td:nth-child(5) { width: 33%; }
  /* Destaque para o campo de nomes sem sacrificar a classificação. */
  .groups-only-table th:nth-child(1), .groups-only-table td:nth-child(1) { width: 5%; }
  .groups-only-table th:nth-child(2), .groups-only-table td:nth-child(2) { width: 9%; }
  .groups-only-table th:nth-child(3), .groups-only-table td:nth-child(3) { width: 44%; }
  .groups-only-table th:nth-child(4), .groups-only-table td:nth-child(4) { width: 7%; }
  .groups-only-table th:nth-child(5), .groups-only-table td:nth-child(5) { width: 7%; }
  .groups-only-table th:nth-child(6), .groups-only-table td:nth-child(6) { width: 7%; }
  .groups-only-table th:nth-child(7), .groups-only-table td:nth-child(7) { width: 7%; }
  .groups-only-table th:nth-child(8), .groups-only-table td:nth-child(8) { width: 7%; }
  .groups-only-table th:nth-child(9), .groups-only-table td:nth-child(9) { width: 7%; }

  .team-name-cell {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:8px;
  }
  .team-name-main { min-width:0; flex:1; }
  .team-editor summary {
    width:22px;
    height:22px;
    font-size:12px;
  }
  .team-editor .inline-schedule-panel {
    min-width:220px;
    padding:10px;
    border-radius:12px;
  }
  .team-editor .inline-schedule-panel label {
    font-size:11px;
    font-weight:700;
    margin:0 0 5px;
  }
  .team-editor .inline-schedule-panel input {
    height:32px;
    padding:6px 8px;
    font-size:12px;
    margin-bottom:8px;
  }
  .print-bracket-sheet {
    padding: 8mm;
    overflow: hidden;
  }
  .print-bracket-fit {
    position: relative;
    width: 100%;
    height: 228mm;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #d4d4d8;
    background: #ffffff;
  }
  .print-bracket-stage {
    position: relative;
    width: 194mm;
    height: 228mm;
    overflow: hidden;
  }
  .print-bracket-board {
    position: absolute;
    left: 50%;
    top: 50%;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    transform-origin: center center;
  }
  .print-bracket-column {
    width: var(--col-width, 150px);
    position: relative;
    min-height: var(--stack-height, auto);
    flex: 0 0 auto;
  }
  .print-bracket-column.champion {
    width: var(--champ-width, 110px);
  }
  .print-bracket-title {
    border: 1px solid #9ca3af;
    padding: 5px 7px;
    font-size: 11px;
    font-weight: 800;
    background: #f5f5f5;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: .02em;
  }
  .print-bracket-stack,
  .print-champion-stage {
    position: relative;
    min-height: var(--stack-height, auto);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .print-champion-stage {
    align-items: center;
    justify-content: center;
  }
  .print-bracket-shell { position: relative; }
  .print-bracket-shell::after {
    content: "";
    position: absolute;
    right: -14px;
    top: 50%;
    width: 14px;
    height: 1px;
    background: #6b7280;
    transform: translateY(-50%);
  }
  .print-bracket-shell.has-feeders::before {
    content: "";
    position: absolute;
    left: -14px;
    top: calc(50% - (var(--feeder-span) / 2));
    width: 14px;
    height: var(--feeder-span);
    border: 1px solid #6b7280;
    border-right: none;
    border-radius: 10px 0 0 10px;
  }
  .print-bracket-card {
    border: 1px solid #111111;
    min-height: var(--card-height, 64px);
    padding: 5px;
    background: #ffffff;
  }
  .print-bracket-card.complete { border-width: 1.5px; }
  .print-bracket-head {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 4px;
    font-size: 8px;
    text-transform: uppercase;
    color: #444444;
    font-weight: 800;
  }
  .print-bracket-side {
    border: 1px solid #c4c4c4;
    padding: 4px 5px;
    margin-bottom: 3px;
    min-height: 22px;
  }
  .print-bracket-side.winner { border: 1.5px solid #111111; }
  .print-bracket-side.placeholder { color: #666666; border-style: dashed; }
  .print-bracket-name {
    font-size: 9px;
    font-weight: 700;
    line-height: 1.2;
  }
  .print-bracket-meta {
    margin-top: 1px;
    font-size: 7.5px;
    color: #555555;
    line-height: 1.2;
  }
  .print-score-box {
    margin-top: 3px;
    font-size: 8.5px;
    font-weight: 700;
  }
  .print-winner {
    margin-top: 3px;
    font-size: 7.5px;
    font-weight: 700;
    line-height: 1.2;
  }
  .print-champion-card {
    border: 1.5px solid #111111;
    padding: 10px 8px;
    text-align: center;
    width: 100%;
    min-height: 74px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #ffffff;
  }
  .print-champion-card .label {
    font-size: 10px;
    text-transform: uppercase;
    color: #444444;
    font-weight: 800;
  }
  .print-champion-card .name {
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    margin-top: 6px;
  }
  .small { font-size: 10px; color: #555555; }
  @media print {
    body { background: #ffffff; }
    .screen-toolbar { display: none !important; }
    .print-root { padding: 0; }
    .sheet {
      margin: 0;
      box-shadow: none;
      width: 100% !important;
      min-height: auto !important;
      padding: 0;
    }
  }

.operation-filters{margin-top:14px;padding:14px 16px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(180deg,color-mix(in srgb,var(--panel-2) 92%, white 2%),color-mix(in srgb,var(--panel) 96%, transparent));box-shadow:0 12px 26px rgba(2,8,23,.06)}
.operation-filters-grid{display:grid;grid-template-columns:minmax(240px,1.2fr) minmax(180px,.9fr) auto auto;gap:12px;align-items:end}
.operation-filters .filter-field label{margin-bottom:5px;font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.operation-filters .filter-field select,
.operation-filters .filter-field input{width:100%}
.operation-filter-segment{display:flex;gap:8px;flex-wrap:wrap}
.operation-filter-btn{min-height:40px;padding:9px 12px;border-radius:999px;background:var(--chip);border:1px solid var(--line);color:var(--text);font-weight:800;box-shadow:none}
.operation-filter-btn.active{background:linear-gradient(135deg,var(--accent-2),var(--accent-2-strong));border-color:var(--accent-2);color:#fff}
.operation-filter-summary{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid color-mix(in srgb,var(--line) 80%, transparent);font-size:12px;color:var(--muted)}
.operation-filter-summary strong{color:var(--text)}
#participantsInput{min-height:340px;padding:14px 16px;font-size:14px;line-height:1.5;border-radius:16px}
@media (max-width: 980px){.operation-filters-grid{grid-template-columns:1fr 1fr}.operation-filters-grid .filter-actions{grid-column:1 / -1}}
@media (max-width: 720px){.operation-filters-grid{grid-template-columns:1fr}.operation-filter-summary{align-items:flex-start}}



</style>
</head>
<body class="${orientation}">
  <div class="screen-toolbar">
    <strong>${escapeHtml(title)}</strong>
    <div class="actions">
      <button type="button" onclick="window.print()">Imprimir</button>
      <button type="button" class="secondary" onclick="window.close()">Fechar</button>
    </div>
  </div>
  <div class="print-root">${safeBodyHtml}</div>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
    try { win.focus(); } catch (error) {}
    if (win.__printFrame) {
      const printFrame = win.__printFrame;
      const runPrint = () => {
        try {
          win.focus();
          win.print();
        } catch (error) {
          setStatus('Não foi possível acionar a impressão neste navegador.', 'error');
        } finally {
          setTimeout(() => {
            try { printFrame.remove(); } catch (error) {}
          }, 1800);
        }
      };
      if (printFrame.contentDocument && printFrame.contentDocument.readyState === 'complete') {
        setTimeout(runPrint, 120);
      } else {
        printFrame.onload = () => setTimeout(runPrint, 120);
      }
    }
  }


