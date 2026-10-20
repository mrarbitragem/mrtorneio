import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/data/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/env/supabasePublic";

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-xl font-bold">MRTorneio — Login</h1>
        <p className="text-sm text-muted-foreground">
          Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` (projeto
          Supabase novo). Enquanto isso, use o modo Demo local na home.
        </p>
        <Button asChild>
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-8">
      <div>
        <h1 className="text-xl font-bold">MRTorneio — Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Conta do Supabase (projeto dedicado ao MRTorneio).
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setError("");
          void supabase.auth
            .signInWithPassword({ email: email.trim(), password })
            .then(({ error: err }) => {
              setLoading(false);
              if (err) {
                setError(err.message);
                return;
              }
              navigate(safeRedirect(params.get("redirect")));
            });
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <Button asChild variant="link">
        <Link to="/">Voltar ao app</Link>
      </Button>
    </div>
  );
}
