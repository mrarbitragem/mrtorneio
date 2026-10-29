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
          O sistema ainda não está configurado: faltam as variáveis `VITE_SUPABASE_URL` e
          `VITE_SUPABASE_PUBLISHABLE_KEY`.
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
          Acesso restrito a organizadores autorizados.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setError("");
          void (async () => {
            const cleanEmail = email.trim().toLowerCase();
            const { error: err } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (err) {
              setLoading(false);
              setError(err.message);
              return;
            }
            // Lista de autorizados. O servidor (RLS) é quem bloqueia de verdade;
            // aqui é só para dar uma mensagem clara. Tabela ainda não criada = não bloqueia.
            const { data: allowed, error: allowErr } = await supabase
              .from("letzmr_allowed_users")
              .select("email")
              .eq("email", cleanEmail)
              .eq("active", true)
              .maybeSingle();
            const tableMissing =
              allowErr?.code === "42P01" || allowErr?.code === "PGRST205";
            if (!tableMissing && (allowErr || !allowed)) {
              await supabase.auth.signOut();
              setLoading(false);
              setError("Este e-mail não está autorizado a usar o MRTorneio. Peça a liberação ao administrador.");
              return;
            }
            setLoading(false);
            navigate(safeRedirect(params.get("redirect")));
          })();
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
