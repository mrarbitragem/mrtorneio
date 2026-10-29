import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLetzmr } from "./useLetzmr";

export function LetzmrHomePage() {
  const {
    store,
    run,
    loadDemo,
    hardReset,
    session,
    user,
    reload,
    deleteTournament,
  } = useLetzmr();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const liveNeedsLogin = session.mode === "live" && !user;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">MRTorneio</h1>
        <p className="max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          MVP operacional: criar torneio → categoria (G+C ou eliminatória) → inscritos → gerar
          grupos/chave → placares → classificar → avançar. Modo{" "}
          <strong>{session.mode === "demo" ? "Demo local" : "Conta (Supabase)"}</strong>
          {session.mode === "demo"
            ? " — dados fictícios em localStorage separado (`letzmr:demo:v1`)."
            : " — persistência por organizador no Supabase (dev)."}
        </p>
      </section>

      {session.lastError && (
        <Alert variant="destructive">
          <AlertTitle>Persistência</AlertTitle>
          <AlertDescription>{session.lastError}</AlertDescription>
        </Alert>
      )}

      {!session.liveConfigured && (
        <Alert>
          <AlertTitle>Supabase live indisponível neste ambiente</AlertTitle>
          <AlertDescription>
            `VITE_SUPABASE_URL` está ausente ou é placeholder. Use Demo local, ou forneça URL/chave
            reais de desenvolvimento e aplique o SQL MRTorneio (ver docs de execução).
          </AlertDescription>
        </Alert>
      )}

      {liveNeedsLogin && (
        <Alert>
          <AlertTitle>Login necessário</AlertTitle>
          <AlertDescription>
            Modo Conta exige autenticação.{" "}
            <Link className="underline" to="/login?redirect=/">
              Entrar
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void loadDemo()
              .then(() => setError(""))
              .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
              .finally(() => setBusy(false));
          }}
        >
          Carregar demo fictícia
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void hardReset()
              .finally(() => setBusy(false));
          }}
        >
          {session.mode === "demo" ? "Limpar demo local" : "Recarregar do servidor"}
        </Button>
        {session.mode === "live" && user && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void reload().finally(() => setBusy(false));
            }}
          >
            Sincronizar
          </Button>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] p-4">
        <h2 className="text-lg font-semibold">Novo torneio</h2>
        {session.mode === "demo" && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Demo não grava no Supabase — isolada dos dados reais.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="tname">Nome</Label>
            <Input
              id="tname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Open Beach 2026"
              className="w-72"
              disabled={liveNeedsLogin}
            />
          </div>
          <Button
            type="button"
            disabled={!name.trim() || busy || liveNeedsLogin}
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
        <h2 className="text-lg font-semibold">Torneios</h2>
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
                      {cats.length} categoria(s) · {t.status}
                      {t.organizerId ? ` · org ${t.organizerId.slice(0, 8)}` : ""}
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
