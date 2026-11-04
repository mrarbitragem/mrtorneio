import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  collectGroupPrintDates,
  collectPrintGames,
  filterGroupsForPrint,
  filterPrintGames,
  gamesPrintDateLabel,
} from "../../domain/print";
import { useLetzmr } from "../useLetzmr";
import { CategoryPrintView } from "./CategoryPrintView";
import { RefereePrintView } from "./RefereePrintView";
import "./printSheets.css";

function printPath(tournamentId: string, categoryId: string | undefined, kind: "grupos" | "arbitros") {
  const base = categoryId
    ? `/t/${tournamentId}/c/${categoryId}/imprimir`
    : `/t/${tournamentId}/imprimir`;
  return kind === "arbitros" ? `${base}/arbitros` : base;
}

function PrintToolbar({
  onClose,
  kind,
  gruposHref,
  arbitrosHref,
}: {
  onClose: string;
  kind: "grupos" | "arbitros";
  gruposHref: string;
  arbitrosHref: string;
}) {
  return (
    <div className="print-toolbar flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {kind === "arbitros" ? "Lista de jogos — A4 retrato." : "Apenas grupos — A4 retrato."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild type="button" variant={kind === "grupos" ? "default" : "outline"}>
          <Link to={gruposHref}>Apenas grupos</Link>
        </Button>
        <Button asChild type="button" variant={kind === "arbitros" ? "default" : "outline"}>
          <Link to={arbitrosHref}>Imprimir jogos</Link>
        </Button>
        <Button type="button" onClick={() => window.print()} data-testid="print-go">
          Imprimir
        </Button>
        <Button asChild type="button" variant="outline">
          <Link to={onClose}>Fechar</Link>
        </Button>
      </div>
    </div>
  );
}

/** Página de impressão do organizador: grupos compactos ou lista para árbitros. */
export function OrganizerPrintPage() {
  const { tournamentId, categoryId, kind: kindParam } = useParams();
  const kind = kindParam === "arbitros" ? "arbitros" : "grupos";
  const { user, authLoading, store, session } = useLetzmr();
  const [allDays, setAllDays] = useState(false);
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [includeUnscheduled, setIncludeUnscheduled] = useState(false);
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [kind]);

  if (!authLoading && !user) {
    const redirect = encodeURIComponent(printPath(tournamentId || "", categoryId, kind));
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (authLoading || session.status === "loading" || session.status === "idle") {
    return <p className="p-6 text-sm">Carregando…</p>;
  }

  const tournament = store.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    return (
      <p className="p-6 text-sm">
        Torneio não encontrado. <Link to="/painel">Voltar</Link>
      </p>
    );
  }

  const tournamentCategories = store.categories
    .filter((c) => c.tournamentId === tournament.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const categories = categoryId
    ? tournamentCategories.filter((c) => c.id === categoryId)
    : tournamentCategories;

  const closeTo = categoryId ? `/t/${tournament.id}/c/${categoryId}` : `/t/${tournament.id}`;
  const refereeCategoryIds = tournamentCategories.map((c) => c.id);
  const groupCategoryIds = categories.map((c) => c.id);
  const allGames = collectPrintGames(store, refereeCategoryIds);
  const availableDates =
    kind === "arbitros"
      ? [...new Set(allGames.map((g) => g.dateKey).filter(Boolean))].sort()
      : collectGroupPrintDates(store, groupCategoryIds);
  const pickedDates = dateKeys.filter((day) => availableDates.includes(day));
  const selectedDates = allDays
    ? availableDates
    : pickedDates.length
      ? pickedDates
      : availableDates.slice(0, 1);
  const dateFilter = {
    allDays: false,
    dateKeys: new Set(selectedDates),
    includeUnscheduled,
  };
  const filteredGames = filterPrintGames(allGames, dateFilter);
  const hasGroupSheets = categories.some((cat) => {
    const allGroups = store.groups.filter((g) => g.categoryId === cat.id);
    if (allGroups.length === 0) return true;
    return (
      filterGroupsForPrint(
        allGroups,
        store.matches.filter((m) => m.categoryId === cat.id),
        dateFilter,
      ).length > 0
    );
  });

  return (
    <div className="min-h-screen bg-[#d9dde3] print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: ${kind === "arbitros" ? "5mm 5mm 6mm" : "10mm"}; }
      `}</style>
      <div className="sticky top-0 z-10 border-b bg-white print:hidden">
      <PrintToolbar
        onClose={closeTo}
        kind={kind}
        gruposHref={printPath(tournament.id, categoryId, "grupos")}
        arbitrosHref={printPath(tournament.id, categoryId, "arbitros")}
      />
      <div className="print-filter">
        <fieldset>
          <legend>Datas</legend>
          <label>
            <input
              type="checkbox"
              checked={allDays}
              onChange={(e) => {
                setAllDays(e.target.checked);
                if (e.target.checked) setDateKeys([]);
              }}
            />
            Todos os dias
          </label>
          {availableDates.map((day) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={allDays || selectedDates.includes(day)}
                onChange={(e) => {
                  setAllDays(false);
                  setDateKeys((prev) => {
                    const current = prev.length ? prev : selectedDates;
                    return e.target.checked
                      ? [...new Set([...current, day])]
                      : current.filter((d) => d !== day);
                  });
                }}
              />
              {gamesPrintDateLabel(day)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Opções</legend>
          <label>
            <input
              type="checkbox"
              checked={includeUnscheduled}
              onChange={(e) => setIncludeUnscheduled(e.target.checked)}
            />
            {kind === "arbitros" ? "Incluir jogos sem data" : "Incluir grupos sem data"}
          </label>
          {kind === "arbitros" && (
            <label>
              <input
                type="checkbox"
                checked={showScores}
                onChange={(e) => setShowScores(e.target.checked)}
              />
              Mostrar resultados já lançados
            </label>
          )}
        </fieldset>
      </div>
      </div>
      <div className="print-root">
        {kind === "grupos" ? (
          categories.length === 0 ? (
            <p className="px-4 text-sm">Nenhuma categoria para imprimir.</p>
          ) : !hasGroupSheets ? (
            <p className="px-4 text-sm">Nenhum grupo neste dia.</p>
          ) : (
            categories.map((cat) => (
              <CategoryPrintView
                key={cat.id}
                store={store}
                categoryId={cat.id}
                tournamentName={tournament.name}
                categoryName={cat.name}
                dateFilter={dateFilter}
              />
            ))
          )
        ) : (
          <RefereePrintView games={filteredGames} showScores={showScores} />
        )}
      </div>
    </div>
  );
}
