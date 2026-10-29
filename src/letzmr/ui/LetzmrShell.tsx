import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLetzmr } from "./useLetzmr";

/** Páginas abertas a qualquer pessoa: a inicial e a consulta pública. */
function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/public");
}

export function LetzmrShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const isPublic = isPublicPath(loc.pathname);
  const { user, authLoading } = useLetzmr();

  // Área do organizador exige login.
  if (!isPublic && !authLoading && !user) {
    const redirect = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* A logo é a porta do organizador: leva ao login, ou ao painel se já entrou. */}
            <Link
              to={user ? "/painel" : "/login"}
              className="flex items-center gap-2"
              aria-label={user ? "Abrir o painel do organizador" : "Entrar como organizador"}
              title={user ? "Painel do organizador" : "Entrar"}
              data-testid="logo-login"
            >
              <img src="/favicon-64.png" alt="MR" className="h-9 w-9 object-contain" />
              <span className="text-lg font-semibold tracking-tight text-[hsl(var(--primary))]">
                Torneio
              </span>
            </Link>
            {user && (
              <nav className="flex gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                <Link to="/painel" className="hover:text-[hsl(var(--foreground))]">
                  Painel
                </Link>
                <Link to="/" className="hover:text-[hsl(var(--foreground))]">
                  Página pública
                </Link>
              </nav>
            )}
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-[14rem] truncate text-xs text-[hsl(var(--muted-foreground))]">
                {user.email}
              </span>
              <SignOutButton onDone={() => navigate("/")} />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function SignOutButton({ onDone }: { onDone: () => void }) {
  const { signOut } = useAuth();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void signOut().then(onDone);
      }}
    >
      Sair
    </Button>
  );
}
