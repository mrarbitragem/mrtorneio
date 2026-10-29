import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLetzmr } from "./useLetzmr";

export function LetzmrHomePage() {
  const { store, run, session, reload, deleteTournament } = useLetzmr();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Torneios</h1>
        <p className="max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          Crie o torneio, cadastre as categorias e as duplas, gere os jogos, lance os placares e
          publique as chaves para os atletas acompanharem.
        </p>
      </section>

      {session.lastError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível sincronizar</AlertTitle>
          <AlertDescription>{session.lastError}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] p-4">
        <h2 className="text-lg font-semibold">Novo torneio</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="tname">Nome</Label>
            <Input
              id="tname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do torneio"
              className="w-72"
            />
          </div>
          <Button
            type="button"
            disabled={!name.trim() || busy}
            onClick={() => {
              setBusy(true);
              setError("");
              void run((eng) => eng.createTournament(name.trim()))
                .then(() => setName(""))
                .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
                .finally(() => setBusy(false));
            }}
          >
            Criar
          </Button>
        </div>
        {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Seus torneios</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void reload().finally(() => setBusy(false));
            }}
          >
            Atualizar
          </Button>
        </div>
        {store.tournaments.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhum torneio ainda.</p>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))]">
            {store.tournaments.map((t) => {
              const cats = store.categories.filter((c) => c.tournamentId === t.id);
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <Link
                      to={`/t/${t.id}`}
                      className="font-medium text-[hsl(var(--primary))] hover:underline"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {cats.length} categoria(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/t/${t.id}`}>Abrir</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      type="button"
                      disabled={busy}
                      data-testid="delete-tournament"
                      onClick={() => {
                        const published = cats.filter((c) => c.published).length;
                        const ok = window.confirm(
                          `Excluir o torneio "${t.name}"?\n\n` +
                            `Isto apaga ${cats.length} categoria(s), inscrições, grupos, jogos e placares` +
                            (published ? `, e tira do ar ${published} página(s) pública(s)` : "") +
                            `. Não dá para desfazer.`,
                        );
                        if (!ok) return;
                        setBusy(true);
                        setError("");
                        void deleteTournament(t.id)
                          .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
                          .finally(() => setBusy(false));
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
