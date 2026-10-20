import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLetzmr } from "./useLetzmr";

export function LetzmrShell() {
  const loc = useLocation();
  const isPublic = loc.pathname.startsWith("/public");
  const { session, user, setMode, authLoading } = useLetzmr();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold tracking-tight text-[hsl(var(--primary))]">
              MRTorneio
            </Link>
            {!isPublic && (
              <nav className="flex gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                <Link to="/" className="hover:text-[hsl(var(--foreground))]">
                  Torneios
                </Link>
              </nav>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isPublic && (
              <div className="flex items-center gap-1 rounded-md border border-[hsl(var(--border))] p-0.5 text-xs">
                <Button
                  type="button"
                  size="sm"
                  variant={session.mode === "demo" ? "default" : "ghost"}
                  className="h-7 px-2"
                  onClick={() => void setMode("demo")}
                >
                  Demo local
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={session.mode === "live" ? "default" : "ghost"}
                  className="h-7 px-2"
                  disabled={!session.liveConfigured}
                  title={
                    session.liveConfigured
                      ? "Dados reais no Supabase"
                      : "Configure VITE_SUPABASE_* reais (não placeholder)"
                  }
                  onClick={() => void setMode("live")}
                >
                  Conta (Supabase)
                </Button>
              </div>
            )}
            {!authLoading && (
              <span className="max-w-[14rem] truncate text-xs text-[hsl(var(--muted-foreground))]">
                {user ? user.email : "Visitante"}
              </span>
            )}
            {!user && !isPublic && (
              <Button asChild variant="outline" size="sm">
                <Link to="/login?redirect=/">Entrar</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/">Início</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
