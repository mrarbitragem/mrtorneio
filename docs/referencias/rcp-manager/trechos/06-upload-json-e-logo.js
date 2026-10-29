/**
 * REFERÊNCIA (não faz parte do build). Trecho copiado do protótipo "RCP Manager"
 * (RCP (2).html, Downloads do Marciel). Linhas de origem: 8950-8979 e 9729-9752.
 * Para o que isso faz e como portar para React/TS, veja ../ESTUDO.md.
 * Os logos em base64 foram removidos do arquivo.
 */

// ---- linhas 8950-8979 ----
  function exportState() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safeName = (state.meta.tournamentName || 'torneio-cbt').toLowerCase().replace(/[^a-z0-9\-]+/gi, '-');
    a.download = safeName + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importState(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        const normalized = migrateLegacyState(imported) || imported;
        if (!normalized || !Array.isArray(normalized.categories)) throw new Error('JSON inválido.');
        state = hydrateState(normalized);
        touchMeta();
        saveToStorage();
        const renderOk = renderAll();
        if (renderOk) setStatus('JSON importado com sucesso.', 'ok');
        else setStatus('JSON importado, mas uma ou mais seções apresentaram falhas ao renderizar.', 'warn');
      } catch (err) {
        setStatus('Falha ao importar JSON: ' + escapeHtml(err.message), 'error');
      }
    };
    reader.readAsText(file);
  }


// ---- linhas 9729-9752 ----
  el.tournamentLogoInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.meta.tournamentPrintLogo = String(reader.result || '');
      touchMeta();
      saveToStorage();
      syncTournamentLogoStatus();
      renderSummary();
      setStatus('Logo do torneio atualizado para as impressões.', 'ok');
    };
    reader.onerror = () => setStatus('Não foi possível carregar o logo do torneio.', 'error');
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  el.clearTournamentLogoBtn?.addEventListener('click', () => {
    state.meta.tournamentPrintLogo = '';
    touchMeta();
    saveToStorage();
    syncTournamentLogoStatus();
    renderSummary();
    setStatus('Logo do torneio removido das impressões.', 'ok');
  });

