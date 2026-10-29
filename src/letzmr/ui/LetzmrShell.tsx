import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useLetzmr } from "./useLetzmr";

export function LetzmrShell() {
  const loc = useLocation();
  const isPublic = loc.pathname.startsWith("/public");
  const { user, authLoading } = useLetzmr();

  // Área do organizador exige login; só a consulta pública é aberta.
  if (!isPublic && !authLoading && !user) {
    const redirect = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/" className="font-semibold tracking-tight text-[hsl(var(--primary))]">
                MRTorneio
              </Link>
            ) : (
              <span className="font-semibold tracking-tight text-[hsl(var(--primary))]">
                MRTorneio
              </span>
            )}
            {!isPublic && (
              <nav className="flex gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                <Link to="/" className="hover:text-[hsl(var(--foreground))]">
                  Torneios
                </Link>
              </nav>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <span className="max-w-[14rem] truncate text-xs text-[hsl(var(--muted-foreground))]">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
